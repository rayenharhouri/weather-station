import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { UsageQueryDto } from './dto/usage-query.dto';
import { UsageService, UsageSnapshot } from './usage.service';

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @ApiOperation({ summary: "Aggregated usage snapshot (KPIs + buckets + per-token + endpoints)." })
  @Get()
  async get(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Query() query: UsageQueryDto,
  ): Promise<{ data: UsageSnapshot }> {
    const range = query.range ?? '24h';
    const snapshot = await this.usage.summary(tenant.slug, user.id, range);
    return { data: snapshot };
  }
}
