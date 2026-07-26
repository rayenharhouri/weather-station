import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import {
  HistoryQueryDto,
  LatestQueryDto,
  StreamQueryDto,
  SummaryQueryDto,
} from './dto/history-query.dto';
import { IngestReadingDto } from './dto/ingest-reading.dto';
import { WeatherReading } from './entities/weather-reading.entity';
import { ReadingsService, WeatherSummary } from './readings.service';
import { ReadingsStreamService } from './readings-stream.service';
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

@ApiTags('readings')
@ApiBearerAuth('jwt')
@Controller()
export class ReadingsController {
  constructor(
    private readonly readingsService: ReadingsService,
    private readonly streamService: ReadingsStreamService,
  ) {}

  @ApiOperation({ summary: "Latest persisted reading for a station." })
  @UseGuards(JwtAuthGuard)
  @Get('readings/latest')
  async latest(
    @CurrentTenant() tenant: Tenant,
    @Query() query: LatestQueryDto,
  ): Promise<PaginatedResponse<WeatherReading>> {
    const reading = await this.readingsService.findLatest(tenant.slug, query.stationId);
    const items = reading ? [reading] : [];
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  @ApiOperation({ summary: "Historical readings, raw or time-bucketed." })
  @UseGuards(JwtAuthGuard)
  @Get('readings/history')
  async history(
    @CurrentTenant() tenant: Tenant,
    @Query() query: HistoryQueryDto,
  ): Promise<PaginatedResponse<WeatherReading>> {
    const items = await this.readingsService.findHistory(tenant.slug, query);
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  @ApiOperation({ summary: "Per-metric min/max/avg/trend over a range." })
  @UseGuards(JwtAuthGuard)
  @Get('readings/summary')
  async summary(
    @CurrentTenant() tenant: Tenant,
    @Query() query: SummaryQueryDto,
  ): Promise<PaginatedResponse<WeatherSummary>> {
    const items = await this.readingsService.summary(tenant.slug, query);
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  @ApiOperation({ summary: "Single-reading HTTP ingest path (MQTT is the primary one)." })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('readings')
  async ingest(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: IngestReadingDto,
  ): Promise<WeatherReading> {
    return this.readingsService.ingest(tenant.slug, dto);
  }

  @ApiOperation({ summary: "SSE stream of new readings (header bearer or ?token=)." })
  @UseGuards(JwtAuthGuard)
  @Sse('readings/stream')
  stream(
    @CurrentTenant() tenant: Tenant,
    @Query() query: StreamQueryDto,
  ): Observable<SseMessage> {
    return this.streamService
      .subscribe(tenant.slug, query.stationId)
      .pipe(map((reading) => ({ data: JSON.stringify(reading) })));
  }
}
