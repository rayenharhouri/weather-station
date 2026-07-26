import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { User } from '../auth/entities/user.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';

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
