import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { Alert, AlertSeverity, AlertStatus } from '../alerts/entities/alert.entity';
import { AlertsService } from '../alerts/alerts.service';
import { assertStationInScope, metricAllowed } from './scope';

class V1AlertsQueryDto {
  @IsOptional()
  @IsUUID()
  station?: string;

  @IsOptional()
  @IsIn(['open', 'acknowledged', 'resolved'])
  status?: AlertStatus;

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: AlertSeverity;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}

interface V1Alert {
  id: string;
  station_id: string;
  metric: string;
  threshold: number;
  actual_value: number;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/alerts')
export class ResearchAlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @ApiOperation({ summary: "Alerts the token can see (post-filtered by scope)." })
  @Get()
  async list(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Query() query: V1AlertsQueryDto,
  ): Promise<{ data: V1Alert[]; next_cursor: null }> {
    if (query.station) assertStationInScope(token, query.station);

    const rows = await this.alerts.list(tenant.slug, {
      stationId: query.station,
      status: query.status,
      severity: query.severity,
      from: query.since,
      to: query.until,
    });

    const { scope } = token;
    const stationFilter = (stationId: string): boolean => {
      if (scope.stations.length === 0) return true;
      if (scope.stations.includes('*')) return scope.crossTenant === true;
      return scope.stations.includes(stationId);
    };

    const data = rows
      .filter((a) => stationFilter(a.stationId))
      .filter((a) => metricAllowed(token, a.metric))
      .map(toV1Alert);

    return { data, next_cursor: null };
  }
}

function toV1Alert(a: Alert): V1Alert {
  return {
    id: a.id,
    station_id: a.stationId,
    metric: a.metric,
    threshold: a.threshold,
    actual_value: a.actualValue,
    severity: a.severity,
    status: a.status,
    message: a.message,
    triggered_at: a.triggeredAt.toISOString(),
    acknowledged_at: a.acknowledgedAt ? a.acknowledgedAt.toISOString() : null,
    resolved_at: a.resolvedAt ? a.resolvedAt.toISOString() : null,
  };
}
