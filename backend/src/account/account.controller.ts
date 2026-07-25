import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { AccountService, AccountSnapshot } from './account.service';
import { UpdateAccountDto } from './dto/update-account.dto';

interface V1Account {
  notifications: AccountSnapshot['notifications'];
  citation_format: AccountSnapshot['citationFormat'];
  auto_cite: boolean;
  active_token_id: string | null;
  orcid: string | null;
  affiliation: string | null;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @ApiOperation({ summary: "Researcher portal preferences for this user." })
  @Get()
  async get(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
  ): Promise<{ data: V1Account }> {
    const snapshot = await this.account.get(tenant.slug, user.id);
    return { data: toV1Account(snapshot) };
  }

  @ApiOperation({ summary: "Update researcher portal preferences." })
  @Patch()
  async patch(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Body() body: UpdateAccountDto,
  ): Promise<{ data: V1Account }> {
    const snapshot = await this.account.patch(tenant.slug, user.id, body);
    return { data: toV1Account(snapshot) };
  }
}

function toV1Account(s: AccountSnapshot): V1Account {
  return {
    notifications: s.notifications,
    citation_format: s.citationFormat,
    auto_cite: s.autoCite,
    active_token_id: s.activeTokenId,
    orcid: s.orcid,
    affiliation: s.affiliation,
  };
}
