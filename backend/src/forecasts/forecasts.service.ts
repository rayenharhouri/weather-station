import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { Forecast, ForecastHorizon } from './entities/forecast.entity';
import { project } from './projector';

const STALE_AFTER_MS = 10 * 60_000;

const HISTORY_WINDOW_MS = 6 * 60 * 60_000;

@Injectable()
export class ForecastsService {
  private readonly logger = new Logger(ForecastsService.name);

  constructor(private readonly tenantService: TenantService) {}

  private async forecastRepo(tenantSlug: string): Promise<Repository<Forecast>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(Forecast);
  }

  private async readingRepo(tenantSlug: string): Promise<Repository<WeatherReading>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(WeatherReading);
  }

  async getOrCompute(
    tenantSlug: string,
    stationId: string,
    horizon: ForecastHorizon = '24h',
  ): Promise<Forecast> {
    const repo = await this.forecastRepo(tenantSlug);
    const cached = await repo.findOne({ where: { stationId, horizon } });
    if (cached && Date.now() - cached.generatedAt.getTime() < STALE_AFTER_MS) {
      return cached;
    }
    return this.recompute(tenantSlug, stationId, horizon, cached);
  }

  private async recompute(
    tenantSlug: string,
    stationId: string,
    horizon: ForecastHorizon,
    existing: Forecast | null,
  ): Promise<Forecast> {
    const readingRepo = await this.readingRepo(tenantSlug);
    const since = new Date(Date.now() - HISTORY_WINDOW_MS);
    const history = await readingRepo
      .createQueryBuilder('r')
      .where('r."stationId" = :stationId', { stationId })
      .andWhere('r."recordedAt" >= :since', { since: since.toISOString() })
      .orderBy('r."recordedAt"', 'ASC')
      .getMany();

    const result = project(history, horizon);
    const now = new Date();
    const validTo =
      result.items.length > 0
        ? new Date(result.items[result.items.length - 1].timestamp)
        : new Date(now.getTime() + 24 * 60 * 60_000);

    const forecastRepo = await this.forecastRepo(tenantSlug);
    const row = forecastRepo.create({
      ...(existing ?? {}),
      stationId,
      horizon,
      generatedAt: now,
      validFrom: now,
      validTo,
      items: result.items,
      confidence: result.confidence,
      explanation: result.explanation,
    });
    return forecastRepo.save(row);
  }
}
