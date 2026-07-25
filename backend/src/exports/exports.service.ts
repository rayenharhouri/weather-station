import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { Repository } from 'typeorm';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { TenantService } from '../tenancy/tenant.service';
import { CreateExportDto } from './dto/exports.dto';
import { ExportJob } from './entities/export-job.entity';
import { materialize } from './materializer';

@Injectable()
export class ExportsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExportsService.name);
  private workerHandle: NodeJS.Timeout | null = null;
  private workerRunning = false;

  constructor(
    private readonly tenantService: TenantService,
    private readonly config: ConfigService,
  ) {}

  // ─── Worker lifecycle ────────────────────────────────────────────

  onApplicationBootstrap(): void {
    const tickMs = this.config.get<number>('exports.workerTickMs') ?? 5000;
    if (tickMs <= 0) {
      this.logger.log('exports worker disabled (workerTickMs <= 0)');
      return;
    }
    this.workerHandle = setInterval(() => {
      void this.tick().catch((err) => {
        this.logger.warn(`worker tick failed: ${err instanceof Error ? err.message : err}`);
      });
    }, tickMs);
    this.logger.log(`exports worker started (tick every ${tickMs}ms)`);
  }

  onModuleDestroy(): void {
    if (this.workerHandle) {
      clearInterval(this.workerHandle);
      this.workerHandle = null;
    }
  }

  /**
   * One worker tick: for every active tenant, claim at most one queued job
   * and materialise it. `FOR UPDATE SKIP LOCKED` makes this safe even with
   * multiple instances (Phase 5+ might fan workers out horizontally).
   */
  private async tick(): Promise<void> {
    if (this.workerRunning) return; // re-entrancy guard
    this.workerRunning = true;
    try {
      const tenants = await this.tenantService.listActive();
      for (const tenant of tenants) {
        try {
          await this.processOneJobForTenant(tenant.slug);
        } catch (err) {
          this.logger.warn(
            `[${tenant.slug}] tick error: ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } finally {
      this.workerRunning = false;
    }
  }

  private async processOneJobForTenant(tenantSlug: string): Promise<void> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    const jobRepo = ds.getRepository(ExportJob);
    const readingRepo = ds.getRepository(WeatherReading);

    // Claim a queued job atomically. SKIP LOCKED makes us tolerant of
    // parallel workers; no row, no work.
    const claim = await ds.query(
      `WITH next AS (
         SELECT "id" FROM "exports"
         WHERE "status" = 'queued'
         ORDER BY "requestedAt" ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE "exports" SET
         "status" = 'running',
         "startedAt" = now(),
         "progressPct" = 1,
         "updatedAt" = now()
       FROM next
       WHERE "exports"."id" = next."id"
       RETURNING "exports"."id"`,
    );
    const claimedId: string | undefined = claim?.[0]?.id ?? claim?.[0]?.[0]?.id;
    if (!claimedId) return;

    const job = await jobRepo.findOne({ where: { id: claimedId } });
    if (!job) return;

    try {
      const result = await materialize({
        job,
        readingRepo,
        rootDir: this.config.get<string>('exports.root')!,
        tenantSlug,
        onProgress: async (pct) => {
          await jobRepo.update({ id: job.id }, { progressPct: pct });
        },
      });

      const ttlHours = this.config.get<number>('exports.ttlHours') ?? 168;
      await jobRepo.update(
        { id: job.id },
        {
          status: 'ready',
          progressPct: 100,
          finishedAt: new Date(),
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60_000),
          recordCount: result.recordCount,
          sizeBytes: String(result.sizeBytes),
          filePath: result.filePath,
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[${tenantSlug}] export ${job.id} failed: ${message}`);
      await jobRepo.update(
        { id: job.id },
        {
          status: 'failed',
          finishedAt: new Date(),
          errorMessage: message.slice(0, 500),
        },
      );
    }
  }

  // ─── API surface ─────────────────────────────────────────────────

  private async repo(tenantSlug: string): Promise<Repository<ExportJob>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(ExportJob);
  }

  async list(tenantSlug: string, userId: string): Promise<ExportJob[]> {
    const repo = await this.repo(tenantSlug);
    const rows = await repo.find({
      where: { userId },
      order: { requestedAt: 'DESC' },
      take: 200,
    });
    // Lazy expiry: flip ready rows past their TTL into `expired` so the
    // listing reflects reality without waiting on a cleanup cron.
    const now = Date.now();
    for (const r of rows) {
      if (r.status === 'ready' && r.expiresAt && r.expiresAt.getTime() <= now) {
        r.status = 'expired';
        void repo.update({ id: r.id }, { status: 'expired' });
      }
    }
    return rows;
  }

  async get(tenantSlug: string, userId: string, jobId: string): Promise<ExportJob> {
    const repo = await this.repo(tenantSlug);
    const job = await repo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException(`Export '${jobId}' not found`);
    if (job.userId !== userId) {
      // Don't leak existence to other users.
      throw new NotFoundException(`Export '${jobId}' not found`);
    }
    return job;
  }

  async create(
    tenantSlug: string,
    userId: string,
    dto: CreateExportDto,
  ): Promise<ExportJob> {
    const repo = await this.repo(tenantSlug);
    const job = repo.create({
      userId,
      name: dto.name,
      metric: dto.metric,
      stationId: dto.station_id ?? null,
      stationName: dto.station_name,
      windowStart: new Date(dto.window_start),
      windowEnd: new Date(dto.window_end),
      format: dto.format,
      status: 'queued',
      requestedAt: new Date(),
      startedAt: null,
      finishedAt: null,
      expiresAt: null,
      recordCount: null,
      sizeBytes: null,
      progressPct: 0,
      errorMessage: null,
      filePath: null,
    });
    return repo.save(job);
  }

  /**
   * Cancel a queued/running job. We can't yank the worker mid-write, so a
   * canceled `running` job will still finish materialising — but we mark
   * the row `failed` immediately so the UI stops waiting on it.
   */
  async cancel(tenantSlug: string, userId: string, jobId: string): Promise<ExportJob> {
    const repo = await this.repo(tenantSlug);
    const job = await this.get(tenantSlug, userId, jobId);
    if (job.status === 'queued' || job.status === 'running') {
      job.status = 'failed';
      job.errorMessage = 'canceled by user';
      job.finishedAt = new Date();
      return repo.save(job);
    }
    return job;
  }

  /**
   * Hard-delete a finished job + its file. Disallowed for in-flight jobs
   * (`queued`/`running`) — call `cancel` first.
   */
  async delete(tenantSlug: string, userId: string, jobId: string): Promise<void> {
    const repo = await this.repo(tenantSlug);
    const job = await this.get(tenantSlug, userId, jobId);
    if (job.status === 'queued' || job.status === 'running') {
      throw new ForbiddenException('cancel_before_delete');
    }
    if (job.filePath) {
      await unlink(job.filePath).catch(() => undefined);
    }
    await repo.delete({ id: jobId });
  }
}
