import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { Grant } from './entities/grant.entity';
import { RequestGrantDto } from './dto/grants.dto';

/**
 * Shape returned to the *target* tenant's admin when listing incoming
 * grants. Carries the home tenant slug alongside the grant row so the
 * admin endpoint knows which tenant DB to write back to on approval.
 */
export interface IncomingGrant {
  homeTenantSlug: string;
  grant: Grant;
}

@Injectable()
export class GrantsService {
  private readonly logger = new Logger(GrantsService.name);

  constructor(private readonly tenantService: TenantService) {}

  private async repo(tenantSlug: string): Promise<Repository<Grant>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(Grant);
  }

  async list(tenantSlug: string, userId: string): Promise<Grant[]> {
    const repo = await this.repo(tenantSlug);
    return repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a new cross-tenant grant request. Approval is a manual flow
   * handled by the *target* tenant's admin — this endpoint just lodges
   * the request as `pending`. Phase 5+ adds the admin surface that flips
   * it to `active` or revokes it.
   */
  async request(
    tenantSlug: string,
    userId: string,
    dto: RequestGrantDto,
  ): Promise<Grant> {
    if (dto.target_tenant === tenantSlug) {
      throw new ForbiddenException('cannot_grant_own_tenant');
    }
    const repo = await this.repo(tenantSlug);
    const grant = repo.create({
      userId,
      targetTenantSlug: dto.target_tenant,
      scope: dto.scope,
      status: 'pending',
      grantedAt: null,
      expiresAt: dto.expires_at ? new Date(dto.expires_at) : null,
      revokedAt: null,
    });
    return repo.save(grant);
  }

  async revoke(tenantSlug: string, userId: string, grantId: string): Promise<Grant> {
    const repo = await this.repo(tenantSlug);
    const grant = await repo.findOne({ where: { id: grantId } });
    if (!grant) throw new NotFoundException(`Grant '${grantId}' not found`);
    if (grant.userId !== userId) {
      // Don't leak existence to other users.
      throw new NotFoundException(`Grant '${grantId}' not found`);
    }
    if (grant.status === 'revoked') return grant;
    grant.status = 'revoked';
    grant.revokedAt = new Date();
    return repo.save(grant);
  }

  // ─── Admin-side: incoming grants (target tenant) ────────────────

  /**
   * Find every grant row across all other active tenants that names
   * `targetSlug` as the target — the inbox for that tenant's admin.
   * Returns the row plus its home tenant slug so callers know where to
   * write back on approve/revoke.
   *
   * Scans every active tenant's `grants` table. Single-instance OK for the
   * MVP; if tenant count grows past a few dozen we'd index a global table
   * instead of scanning.
   */
  async listIncomingFor(targetSlug: string): Promise<IncomingGrant[]> {
    const tenants = await this.tenantService.listActive();
    const out: IncomingGrant[] = [];
    for (const tenant of tenants) {
      if (tenant.slug === targetSlug) continue;
      try {
        const repo = await this.repo(tenant.slug);
        const rows = await repo.find({
          where: { targetTenantSlug: targetSlug },
          order: { createdAt: 'DESC' },
        });
        for (const grant of rows) {
          out.push({ homeTenantSlug: tenant.slug, grant });
        }
      } catch (err) {
        this.logger.warn(
          `incoming-grants scan: [${tenant.slug}] unreachable: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return out;
  }

  /**
   * Flip an incoming grant to `active`. The grant row lives in the home
   * tenant's DB (the side that requested it) — we write back there.
   * Idempotent: already-active rows are returned unchanged.
   *
   * The caller must hold the *target* tenant's admin role; routes enforce
   * that via `RolesGuard`. This method assumes the authorisation has
   * already happened and only validates that the grant in fact targets
   * the calling tenant (`targetSlug`).
   */
  async approveIncoming(
    homeSlug: string,
    grantId: string,
    targetSlug: string,
  ): Promise<Grant> {
    const repo = await this.repo(homeSlug);
    const grant = await repo.findOne({ where: { id: grantId } });
    if (!grant) throw new NotFoundException(`Grant '${grantId}' not found`);
    if (grant.targetTenantSlug !== targetSlug) {
      // Wrong tenant trying to approve someone else's incoming row.
      throw new ForbiddenException('not_grant_target');
    }
    if (grant.status === 'active') return grant;
    grant.status = 'active';
    grant.grantedAt = new Date();
    grant.revokedAt = null;
    return repo.save(grant);
  }

  async revokeIncoming(
    homeSlug: string,
    grantId: string,
    targetSlug: string,
  ): Promise<Grant> {
    const repo = await this.repo(homeSlug);
    const grant = await repo.findOne({ where: { id: grantId } });
    if (!grant) throw new NotFoundException(`Grant '${grantId}' not found`);
    if (grant.targetTenantSlug !== targetSlug) {
      throw new ForbiddenException('not_grant_target');
    }
    if (grant.status === 'revoked') return grant;
    grant.status = 'revoked';
    grant.revokedAt = new Date();
    return repo.save(grant);
  }
}
