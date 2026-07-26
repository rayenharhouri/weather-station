import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { AccountService, SettingsSnapshot } from './account.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('settings')
@ApiBearerAuth('jwt')
@Controller('settings')
export class SettingsController {
  constructor(private readonly account: AccountService) {}

  @ApiOperation({ summary: "Operator settings — ops-side notifications + alert thresholds." })
  @Get('preferences')
  async get(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
  ): Promise<SettingsSnapshot> {
    return this.account.getSettings(tenant.slug, user.id);
  }

  @ApiOperation({ summary: "Update operator settings (notifications / thresholds)." })
  @Patch('preferences')
  async patch(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Body() body: UpdateSettingsDto,
  ): Promise<SettingsSnapshot> {
    return this.account.patchSettings(tenant.slug, user.id, body);
  }
}
