import { Injectable, Logger, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';

declare module 'express' {
  interface Request {
    tenant?: Tenant;
  }
}

/**
 * Resolves the tenant for the current request and attaches it to req.tenant.
 *
 * Resolution order:
 *   1. `X-Tenant` header (explicit, useful for tools and tests)
 *   2. Host subdomain — `enit.weatherhub.local` → slug `enit`
 *
 * Bare hostnames and the wildcard `localhost` host (no subdomain) are skipped
 * silently — routes that require a tenant must enforce that themselves via a
 * guard (added in a later phase). This middleware is intentionally permissive
 * so unauthenticated endpoints like /health keep working.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const slug = this.resolveSlug(req);
    if (!slug) {
      return next();
    }

    try {
      req.tenant = await this.tenantService.findBySlug(slug);
      next();
    } catch (err) {
      if (err instanceof NotFoundException) {
        this.logger.warn(`Unknown tenant '${slug}' for ${req.method} ${req.path}`);
      }
      next(err);
    }
  }

  private resolveSlug(req: Request): string | null {
    const headerSlug = req.header('x-tenant');
    if (headerSlug) return headerSlug.toLowerCase();

    const host = req.header('host') ?? '';
    const [hostname] = host.split(':');

    // Skip IPv4-looking hosts — `127.0.0.1` would otherwise be parsed as
    // tenant `127`, fail the lookup, and break Docker healthchecks +
    // internal container traffic.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const candidate = parts[0].toLowerCase();
      // Slug shape: lowercase letters / digits / hyphens, 2–32 chars —
      // same regex `tenant:provision` enforces at write time.
      if (
        candidate &&
        candidate !== 'www' &&
        /^[a-z0-9-]{2,32}$/.test(candidate)
      ) {
        return candidate;
      }
    }
    return null;
  }
}
