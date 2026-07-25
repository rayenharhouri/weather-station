import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ForecastQueryDto } from './dto/forecast-query.dto';
import { Forecast } from './entities/forecast.entity';
import { ForecastsService } from './forecasts.service';

@UseGuards(JwtAuthGuard)
@ApiTags('forecasts')
@ApiBearerAuth('jwt')
@Controller('forecasts')
export class ForecastsController {
  constructor(private readonly forecasts: ForecastsService) {}

  @ApiOperation({ summary: "Cached forecast for (station, horizon); recomputed on staleness." })
  @Get()
  async get(
    @CurrentTenant() tenant: Tenant,
    @Query() query: ForecastQueryDto,
  ): Promise<Forecast> {
    return this.forecasts.getOrCompute(tenant.slug, query.stationId, query.horizon);
  }
}
