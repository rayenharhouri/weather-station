import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Request } from 'express';
import { Grant } from '../../grants/entities/grant.entity';
import { TenantService } from '../../tenancy/tenant.service';
import { ApiToken } from '../../tokens/entities/api-token.entity';
import { User } from '../entities/user.entity';

declare module 'express' {
  interface Request {
    apiToken?: ApiToken;
    tokenHomeTenant?: string;
  }
}

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(TokenAuthGuard.name);

  constructor(private readonly tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const plaintext = extractBearer(req) ?? extractQueryToken(req);
    if (!plaintext) {
      throw new UnauthorizedException('missing_token');
    }
    if (!plaintext.startsWith('wh_rsa_')) {
      throw new UnauthorizedException('invalid_token_format');
    }

    if (!req.tenant) {
      throw new UnauthorizedException('missing_tenant');
    }

    const hashedToken = createHash('sha256').update(plaintext).digest('hex');
    const targetSlug = req.tenant.slug;

    const targetDs = await this.tenantService.getDataSource(targetSlug);
    const targetTokens = targetDs.getRepository(ApiToken);
    let token = await targetTokens.findOne({ where: { hashedToken } });
    let homeSlug = targetSlug;
    let homeTokenRepo = targetTokens;

    if (!token) {
      const candidate = await this.findTokenInOtherTenants(hashedToken, targetSlug);
      if (!candidate) {
        throw new UnauthorizedException('invalid_token');
      }

      if (!candidate.token.scope.crossTenant) {
        throw new UnauthorizedException('cross_tenant_denied');
      }

      const granted = await this.hasActiveGrant(
        candidate.tenantSlug,
        candidate.token.userId,
        targetSlug,
      );
      if (!granted) {
        throw new UnauthorizedException('cross_tenant_not_granted');
      }

      if (req.method !== 'GET') {
        throw new UnauthorizedException('cross_tenant_write_denied');
      }

      const homeDs = await this.tenantService.getDataSource(candidate.tenantSlug);
      token = candidate.token;
      homeSlug = candidate.tenantSlug;
      homeTokenRepo = homeDs.getRepository(ApiToken);
    }

    if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
      if (token.status === 'active') {
        token.status = 'expired';
        await homeTokenRepo.save(token);
      }
      throw new UnauthorizedException('token_expired');
    }
    if (token.status === 'revoked') {
      throw new UnauthorizedException('token_revoked');
    }
    if (token.status !== 'active') {
      throw new UnauthorizedException(`token_${token.status}`);
    }

    const homeDs = await this.tenantService.getDataSource(homeSlug);
    const user = await homeDs.getRepository(User).findOne({ where: { id: token.userId } });
    if (!user) {
      throw new UnauthorizedException('invalid_token');
    }

    void homeTokenRepo
      .createQueryBuilder()
      .update()
      .set({
        lastUsedAt: () => 'now()',
        requestsTotal: () => '"requestsTotal" + 1',
      })
      .where('id = :id', { id: token.id })
      .execute()
      .catch((err) => {
        this.logger.warn(
          `Failed to update token usage for ${token!.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    req.user = user;
    req.apiToken = token;
    req.tokenHomeTenant = homeSlug;
    return true;
  }

  private async findTokenInOtherTenants(
    hashedToken: string,
    excludeSlug: string,
  ): Promise<{ token: ApiToken; tenantSlug: string } | null> {
    const tenants = await this.tenantService.listActive();
    for (const tenant of tenants) {
      if (tenant.slug === excludeSlug) continue;
      try {
        const ds = await this.tenantService.getDataSource(tenant.slug);
        const candidate = await ds
          .getRepository(ApiToken)
          .findOne({ where: { hashedToken } });
        if (candidate) {
          return { token: candidate, tenantSlug: tenant.slug };
        }
      } catch (err) {
        this.logger.warn(
          `cross-tenant scan: [${tenant.slug}] unreachable: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return null;
  }

  private async hasActiveGrant(
    homeSlug: string,
    userId: string,
    targetSlug: string,
  ): Promise<boolean> {
    const ds = await this.tenantService.getDataSource(homeSlug);
    const grant = await ds.getRepository(Grant).findOne({
      where: { userId, targetTenantSlug: targetSlug, status: 'active' },
    });
    if (!grant) return false;
    if (grant.expiresAt && grant.expiresAt.getTime() <= Date.now()) return false;
    return true;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}

function extractQueryToken(req: Request): string | null {
  const raw = req.query?.token;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return raw.trim();
}
