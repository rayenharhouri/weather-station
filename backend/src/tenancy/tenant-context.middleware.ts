import { Injectable, Logger, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';

declare module 'express' {
  interface Request {
    tenant?: Tenant;
  }
}

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

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const candidate = parts[0].toLowerCase();
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
