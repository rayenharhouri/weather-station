import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { Grant, GrantStatus } from './entities/grant.entity';
import { GrantsService } from './grants.service';
import { RequestGrantDto } from './dto/grants.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface V1Grant {
  id: string;
  target_tenant: string;
  scope: string;
  status: GrantStatus;
  granted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/grants')
export class GrantsController {
  constructor(private readonly grants: GrantsService) {}

  @ApiOperation({ summary: "List cross-tenant grants the caller has requested." })
  @Get()
  async list(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
  ): Promise<{ data: V1Grant[] }> {
    const rows = await this.grants.list(tenant.slug, user.id);
    return { data: rows.map(toV1Grant) };
  }

  @ApiOperation({ summary: "Request a cross-tenant grant; lands as pending." })
  @Post('request')
  async request(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Body() body: RequestGrantDto,
  ): Promise<{ data: V1Grant }> {
    const grant = await this.grants.request(tenant.slug, user.id, body);
    return { data: toV1Grant(grant) };
  }

  @ApiOperation({ summary: "Revoke one of your grants." })
  @Delete(':id')
  async revoke(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ data: V1Grant }> {
    const grant = await this.grants.revoke(tenant.slug, user.id, id);
    return { data: toV1Grant(grant) };
  }
}

function toV1Grant(g: Grant): V1Grant {
  return {
    id: g.id,
    target_tenant: g.targetTenantSlug,
    scope: g.scope,
    status: g.status,
    granted_at: g.grantedAt ? g.grantedAt.toISOString() : null,
    expires_at: g.expiresAt ? g.expiresAt.toISOString() : null,
    revoked_at: g.revokedAt ? g.revokedAt.toISOString() : null,
    created_at: g.createdAt.toISOString(),
  };
}
