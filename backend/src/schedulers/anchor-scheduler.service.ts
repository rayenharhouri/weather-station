import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StationsService } from '../stations/stations.service';
import { IntegrityService } from '../integrity/integrity.service';
import { TenantService } from '../tenancy/tenant.service';

@Injectable()
export class AnchorSchedulerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AnchorSchedulerService.name);
  private handle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly tenantService: TenantService,
    private readonly stations: StationsService,
    private readonly integrity: IntegrityService,
  ) {}

  onApplicationBootstrap(): void {
    const mode = this.config.get<string>('mode');
    if (mode === 'test') return;
    const tickMs = this.config.get<number>('schedulers.anchorTickMs') ?? 5 * 60_000;
    if (tickMs <= 0) {
      this.logger.log('anchor scheduler disabled (anchorTickMs <= 0)');
      return;
    }
    this.handle = setInterval(() => {
      void this.tick().catch((err) => {
        this.logger.warn(`tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, tickMs);
    this.logger.log(`anchor scheduler started (tick every ${tickMs}ms)`);
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
            try {
              const batch = await this.integrity.createBatch(tenant.slug, station.id);
              if (batch) {
                this.logger.log(
                  `[${tenant.slug}/${station.id}] anchored ${batch.recordCount} reading(s) → batch ${batch.id}`,
                );
              }
            } catch (err) {
              this.logger.warn(
                `[${tenant.slug}/${station.id}] anchor failed: ${err instanceof Error ? err.message : err}`,
              );
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
