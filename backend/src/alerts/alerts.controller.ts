import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { AlertsService } from './alerts.service';
import { AlertsStreamService } from './alerts-stream.service';
import { Alert } from './entities/alert.entity';
import { ListAlertsQueryDto, StreamAlertsQueryDto } from './dto/list-alerts.query';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface SseMessage {
  data: string;
}

@UseGuards(JwtAuthGuard)
@ApiTags('alerts')
@ApiBearerAuth('jwt')
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly stream: AlertsStreamService,
  ) {}

  @ApiOperation({ summary: "Filtered alert list (station / status / severity / time window)." })
  @Get()
  async list(
    @CurrentTenant() tenant: Tenant,
    @Query() query: ListAlertsQueryDto,
  ): Promise<PaginatedResponse<Alert>> {
    const items = await this.alerts.list(tenant.slug, query);
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  @ApiOperation({ summary: "Mark an open alert as acknowledged." })
  @Patch(':id/ack')
  async acknowledge(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Alert> {
    return this.alerts.acknowledge(tenant.slug, id, user.id);
  }

  @ApiOperation({ summary: "Mark an alert resolved (auto-acks if not already)." })
  @Patch(':id/resolve')
  async resolve(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Alert> {
    return this.alerts.resolve(tenant.slug, id, user.id);
  }

  /**
   * SSE stream of new alerts for this tenant. `?stationId=` is an optional
   * filter — omit it to receive the whole tenant firehose.
   */
  @ApiOperation({ summary: "SSE stream of new alerts for this tenant." })
  @Sse('stream')
  streamAlerts(
    @CurrentTenant() tenant: Tenant,
    @Query() query: StreamAlertsQueryDto,
  ): Observable<SseMessage> {
    return this.stream
      .subscribe(tenant.slug, query.stationId)
      .pipe(map((alert) => ({ data: JSON.stringify(alert) })));
  }
}
