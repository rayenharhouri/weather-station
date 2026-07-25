import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { User } from '../auth/entities/user.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';

/**
 * Researcher public API (`/v1/*`). All endpoints here authenticate with an
 * API token (the long-lived `wh_rsa_…` strings minted on `/research/tokens`),
 * not with a user JWT.
 *
 * For now only `/v1/me` exists — a self-introspection endpoint that proves
 * the bearer is good and reports back what the server resolved (user,
 * tenant, token scope). Real data endpoints (`/v1/readings`,
 * `/v1/stations`, `/v1/forecasts`, …) will live alongside this once their
 * shapes are pinned down.
 */
@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1')
export class ResearchApiController {
  @ApiOperation({ summary: "Introspect the API token currently presented." })
  @Get('me')
  me(
    @CurrentUser() user: User,
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
  ) {
    return {
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token: {
        id: token.id,
        name: token.name,
        suffix: token.suffix,
        scope: token.scope,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        requestsTotal: token.requestsTotal,
      },
    };
  }
}
