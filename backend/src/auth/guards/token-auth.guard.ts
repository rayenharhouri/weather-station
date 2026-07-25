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

/**
 * Augment Express's request so handlers can pull the resolved API token
 * alongside the user the middleware/guard chain already populates.
 */
declare module 'express' {
  interface Request {
    apiToken?: ApiToken;
    /**
     * Slug of the tenant the token was minted in. Equals `req.tenant.slug`
     * for normal home-tenant requests; differs only for cross-tenant
     * requests authorised by an active `grants` row.
     */
    tokenHomeTenant?: string;
  }
}

/**
 * Bearer-token guard for the public Researcher API (`/v1/*`).
 *
 * Resolution order, walked in `canActivate`:
 *
 *   1. Pull `Authorization: Bearer wh_rsa_…` (or `?token=…` for EventSource).
 *   2. Find the tenant the request is targeting (`req.tenant`, set by the
 *      TenantContextMiddleware).
 *   3. Try the target tenant's `api_tokens` table first. Hit → home request.
 *   4. **Cross-tenant fallback.** Miss → scan every other active tenant for
 *      the same `hashedToken`. Hit → check the home tenant has an active
 *      `grants` row pointing at the target tenant. No grant → 401
 *      `cross_tenant_not_granted`. Active grant → accept the request, with
 *      two extra restrictions:
 *        - **Read-only**: only `GET` is permitted across tenants (writes
 *          would orphan rows referencing a userId that doesn't exist in
 *          the target DB).
 *        - **Scope marker**: the token's scope must carry `crossTenant: true`.
 *          A "home-only" token can't be used cross-tenant even if a grant
 *          exists — the operator who minted it intended local-only access.
 *   5. Status + expiry checks (lazy `expired` flip on a stale `expiresAt`).
 *   6. Load the owning user from the **home** tenant.
 *   7. Fire-and-forget usage bookkeeping.
 *   8. Attach `req.apiToken`, `req.user`, `req.tokenHomeTenant`.
 */
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
      // Without a tenant we don't know which DB to search. Surface this
      // clearly so the caller adds an X-Tenant header / uses the right host.
      throw new UnauthorizedException('missing_tenant');
    }

    const hashedToken = createHash('sha256').update(plaintext).digest('hex');
    const targetSlug = req.tenant.slug;

    // ── Step 1: try the target tenant's local table ──
    const targetDs = await this.tenantService.getDataSource(targetSlug);
    const targetTokens = targetDs.getRepository(ApiToken);
    let token = await targetTokens.findOne({ where: { hashedToken } });
    let homeSlug = targetSlug;
    let homeTokenRepo = targetTokens;

    // ── Step 2: cross-tenant fallback ──
    if (!token) {
      const candidate = await this.findTokenInOtherTenants(hashedToken, targetSlug);
      if (!candidate) {
        throw new UnauthorizedException('invalid_token');
      }

      // Token's scope must mark it as cross-tenant-eligible. Skips home-only
      // tokens that happened to be presented at the wrong host.
      if (!candidate.token.scope.crossTenant) {
        throw new UnauthorizedException('cross_tenant_denied');
      }

      // Active grant required.
      const granted = await this.hasActiveGrant(
        candidate.tenantSlug,
        candidate.token.userId,
        targetSlug,
      );
      if (!granted) {
        throw new UnauthorizedException('cross_tenant_not_granted');
      }

      // Cross-tenant requests are read-only — preventing writes against the
      // target DB that would reference a user id that doesn't exist there.
      if (req.method !== 'GET') {
        throw new UnauthorizedException('cross_tenant_write_denied');
      }

      const homeDs = await this.tenantService.getDataSource(candidate.tenantSlug);
      token = candidate.token;
      homeSlug = candidate.tenantSlug;
      homeTokenRepo = homeDs.getRepository(ApiToken);
    }

    // ── Step 3: status + expiry ──
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

    // ── Step 4: load the user from the home tenant ──
    const homeDs = await this.tenantService.getDataSource(homeSlug);
    const user = await homeDs.getRepository(User).findOne({ where: { id: token.userId } });
    if (!user) {
      throw new UnauthorizedException('invalid_token');
    }

    // ── Step 5: fire-and-forget usage bookkeeping (against the home table) ──
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

  /**
   * Scan every active tenant other than `excludeSlug` for the given
   * hashed token. Stops on the first hit. Hashed tokens are indexed
   * unique within a tenant, but two tenants can in theory hold the same
   * digest (extreme collision; treat first-found as authoritative).
   */
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
        // A single tenant DB being unreachable shouldn't break cross-tenant
        // auth for the others. Log and keep scanning.
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

/**
 * Query-string fallback for browsers using `EventSource`, which cannot send
 * an `Authorization` header. Only the SSE routes are reached this way in
 * practice — every other `/v1/*` route is called by clients that can set
 * the header.
 *
 * Caveat: query-string tokens land in access logs and `Referer` headers, so
 * they leak more easily than header tokens. The mitigation is operational
 * (rotate quickly via `/v1/tokens/:id/rotate`) rather than structural.
 */
function extractQueryToken(req: Request): string | null {
  const raw = req.query?.token;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return raw.trim();
}
