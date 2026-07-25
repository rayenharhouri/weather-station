import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { Grant, GrantStatus } from './entities/grant.entity';
import { GrantsService } from './grants.service';

interface AdminIncomingGrant {
  id: string;
  home_tenant: string;
  user_id: string;
  scope: string;
  status: GrantStatus;
  granted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/**
 * Operations-side admin surface for grants that **target this tenant**.
 *
 * Researchers create grant requests from `/v1/grants/request` (token auth,
 * writes to the requesting tenant's `grants` table). Admins of the
 * *target* tenant approve or revoke them here (JWT auth + `admin` role).
 * Approval writes back to the requesting tenant's row.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/grants')
export class AdminGrantsController {
  constructor(private readonly grants: GrantsService) {}

  @Get('incoming')
  @ApiOperation({
    summary:
      'List grant requests from other tenants targeting this one — the admin inbox.',
  })
  async incoming(
    @CurrentTenant() tenant: Tenant,
  ): Promise<{ data: AdminIncomingGrant[] }> {
    const rows = await this.grants.listIncomingFor(tenant.slug);
    return {
      data: rows.map(({ homeTenantSlug, grant }) =>
        toAdminIncoming(homeTenantSlug, grant),
      ),
    };
  }

  @Patch(':homeTenantSlug/:grantId/approve')
  @ApiOperation({ summary: 'Approve an incoming grant.' })
  async approve(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('homeTenantSlug') homeSlug: string,
    @Param('grantId', new ParseUUIDPipe()) grantId: string,
  ): Promise<{ data: AdminIncomingGrant }> {
    assertCleanSlug(homeSlug);
    const grant = await this.grants.approveIncoming(
      homeSlug.toLowerCase(),
      grantId,
      tenant.slug,
    );
    this.logRoleAction(user, tenant.slug, 'approve', grantId, homeSlug);
    return { data: toAdminIncoming(homeSlug.toLowerCase(), grant) };
  }

  @Patch(':homeTenantSlug/:grantId/revoke')
  @ApiOperation({ summary: 'Revoke an incoming grant (or never-approve a pending one).' })
  async revoke(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('homeTenantSlug') homeSlug: string,
    @Param('grantId', new ParseUUIDPipe()) grantId: string,
  ): Promise<{ data: AdminIncomingGrant }> {
    assertCleanSlug(homeSlug);
    const grant = await this.grants.revokeIncoming(
      homeSlug.toLowerCase(),
      grantId,
      tenant.slug,
    );
    this.logRoleAction(user, tenant.slug, 'revoke', grantId, homeSlug);
    return { data: toAdminIncoming(homeSlug.toLowerCase(), grant) };
  }

  private logRoleAction(
    user: User,
    targetSlug: string,
    action: 'approve' | 'revoke',
    grantId: string,
    homeSlug: string,
  ): void {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: 'admin.grants',
        action,
        actor: user.id,
        targetTenant: targetSlug,
        homeTenant: homeSlug,
        grantId,
      }),
    );
  }
}

function assertCleanSlug(slug: string): void {
  if (!/^[a-z0-9-]{2,32}$/i.test(slug)) {
    throw new ForbiddenException('invalid_tenant_slug');
  }
}

function toAdminIncoming(homeTenantSlug: string, g: Grant): AdminIncomingGrant {
  return {
    id: g.id,
    home_tenant: homeTenantSlug,
    user_id: g.userId,
    scope: g.scope,
    status: g.status,
    granted_at: g.grantedAt ? g.grantedAt.toISOString() : null,
    expires_at: g.expiresAt ? g.expiresAt.toISOString() : null,
    revoked_at: g.revokedAt ? g.revokedAt.toISOString() : null,
    created_at: g.createdAt.toISOString(),
  };
}
