import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ForecastsService } from '../forecasts/forecasts.service';
import {
  ForecastHorizon,
} from '../forecasts/entities/forecast.entity';
import { StationsService } from '../stations/stations.service';
import { TenantService } from '../tenancy/tenant.service';

const HORIZONS: ForecastHorizon[] = ['1h', '3h', '6h', '24h'];

/**
 * Periodic worker that pre-warms `ForecastsService.getOrCompute()` for
 * every (tenant, station, horizon) tuple. The on-demand path already
 * recomputes on stale-cache; this scheduler just keeps requests fast even
 * for stations nobody's looked at recently.
 *
 * Skipped in `test` mode. Default cadence: 10 minutes — matches the
 * `STALE_AFTER_MS` constant in `ForecastsService` so we re-warm just
 * before the cache would have been considered stale.
 */
@Injectable()
export class ForecastSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ForecastSchedulerService.name);
  private handle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly tenantService: TenantService,
    private readonly stations: StationsService,
    private readonly forecasts: ForecastsService,
  ) {}

  onApplicationBootstrap(): void {
    const mode = this.config.get<string>('mode');
    if (mode === 'test') return;
    const tickMs = this.config.get<number>('schedulers.forecastTickMs') ?? 10 * 60_000;
    if (tickMs <= 0) {
      this.logger.log('forecast scheduler disabled (forecastTickMs <= 0)');
      return;
    }
    this.handle = setInterval(() => {
      void this.tick().catch((err) => {
        this.logger.warn(`tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, tickMs);
    this.logger.log(`forecast scheduler started (tick every ${tickMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const tenants = await this.tenantService.listActive();
      for (const tenant of tenants) {
        try {
          const stations = await this.stations.findAll(tenant.slug);
          for (const station of stations) {
            for (const horizon of HORIZONS) {
              try {
                await this.forecasts.getOrCompute(tenant.slug, station.id, horizon);
              } catch (err) {
                this.logger.warn(
                  `[${tenant.slug}/${station.id}/${horizon}] precompute failed: ${err instanceof Error ? err.message : err}`,
                );
              }
            }
          }
        } catch (err) {
          this.logger.warn(
            `[${tenant.slug}] tick error: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
