import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import {
  Forecast,
  ForecastHorizon,
  ForecastItem,
} from '../forecasts/entities/forecast.entity';
import { ForecastsService } from '../forecasts/forecasts.service';
import { FORECAST_HORIZONS } from '../forecasts/dto/forecast-query.dto';
import { assertStationInScope, metricAllowed } from './scope';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

class V1ForecastQueryDto {
  @IsUUID()
  station!: string;

  @IsOptional()
  @IsIn(FORECAST_HORIZONS)
  horizon?: ForecastHorizon;
}

interface V1ForecastItem {
  timestamp: string;
  metric: string;
  predicted_value: number;
  confidence: number;
}

interface V1Forecast {
  id: string;
  station_id: string;
  horizon: ForecastHorizon;
  generated_at: string;
  valid_from: string;
  valid_to: string;
  items: V1ForecastItem[];
  confidence: number;
  explanation: string;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/forecasts')
export class ResearchForecastsController {
  constructor(private readonly forecasts: ForecastsService) {}

  @ApiOperation({ summary: "Forecast for a station (scope-checked, metric-filtered)." })
  @Get()
  async get(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Query() query: V1ForecastQueryDto,
  ): Promise<{ data: V1Forecast }> {
    assertStationInScope(token, query.station);
    const forecast = await this.forecasts.getOrCompute(
      tenant.slug,
      query.station,
      query.horizon,
    );
    return { data: toV1Forecast(forecast, token) };
  }
}

function toV1Forecast(f: Forecast, token: ApiToken): V1Forecast {
  return {
    id: f.id,
    station_id: f.stationId,
    horizon: f.horizon,
    generated_at: f.generatedAt.toISOString(),
    valid_from: f.validFrom.toISOString(),
    valid_to: f.validTo.toISOString(),
    items: f.items.filter((it: ForecastItem) => metricAllowed(token, it.metric)).map((it) => ({
      timestamp: it.timestamp,
      metric: it.metric,
      predicted_value: it.predictedValue,
      confidence: it.confidence,
    })),
    confidence: f.confidence,
    explanation: f.explanation,
  };
}
