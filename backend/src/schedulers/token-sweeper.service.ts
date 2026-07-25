import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { TenantService } from '../tenancy/tenant.service';

/**
 * Periodic cron that flips `active` API tokens to `expired` once their
 * `expiresAt` window has passed.
 *
 * Lazy expiry already covers reads (`TokenAuthGuard` rejects a request the
 * moment it sees an expired token, and stamps the status as it does). The
 * sweeper exists so the list view on `/research/tokens` shows reality
 * without having to wait for each row to be touched.
 *
 * Skipped in `test` mode.
 */
@Injectable()
export class TokenSweeperService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TokenSweeperService.name);
  private handle: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly tenantService: TenantService,
  ) {}

  onApplicationBootstrap(): void {
    const mode = this.config.get<string>('mode');
    if (mode === 'test') return;
    // Hourly is enough; the lazy path covers anything finer-grained.
    const tickMs = this.config.get<number>('schedulers.tokenSweeperTickMs') ?? 60 * 60_000;
    if (tickMs <= 0) return;
    this.handle = setInterval(() => {
      void this.tick().catch((err) => {
        this.logger.warn(`tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, tickMs);
    this.logger.log(`token sweeper started (tick every ${tickMs}ms)`);
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
          const ds = await this.tenantService.getDataSource(tenant.slug);

          // 1. Flip tokens past `expiresAt` from active → expired.
          const expiredResult = await ds
            .createQueryBuilder()
            .update(ApiToken)
            .set({ status: 'expired' })
            .where('status = :status', { status: 'active' })
            .andWhere('"expiresAt" IS NOT NULL')
            .andWhere('"expiresAt" <= now()')
            .execute();
          const expired = expiredResult.affected ?? 0;
          if (expired > 0) {
            this.logger.log(`[${tenant.slug}] expired ${expired} token(s)`);
          }

          // 2. Prune request_logs older than 90 days. Plain DELETE — fine
          // at this scale; partition-drop swap-in if rows grow past a few
          // million per tenant.
          const pruneResult: unknown = await ds.query(
            `DELETE FROM "request_logs" WHERE "timestamp" < now() - interval '90 days'`,
          );
          const pruned =
            Array.isArray(pruneResult) && pruneResult.length >= 2 && typeof pruneResult[1] === 'number'
              ? pruneResult[1]
              : 0;
          if (pruned > 0) {
            this.logger.log(`[${tenant.slug}] pruned ${pruned} request_log row(s)`);
          }
        } catch (err) {
          this.logger.warn(
            `[${tenant.slug}] sweep failed: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
