import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface ReadyReport {
  status: 'ok' | 'degraded';
  checks: {
    masterDb: boolean;
    migrationsApplied: boolean;
    hederaConfigured: boolean | 'stubbed';
  };
  details: Record<string, string | undefined>;
  timestamp: string;
}

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    @InjectDataSource() private readonly masterDs: DataSource,
    private readonly config: ConfigService,
  ) {}

  /**
   * Liveness probe. Cheap — never blocks on dependencies. Indicates the
   * process is up and the event loop is responsive. Returns 200 always.
   */
  @ApiOperation({ summary: "Liveness probe — never blocks on dependencies." })
  @Get('health')
  ping() {
    return {
      status: 'ok',
      service: 'weatherhub-backend',
      mode: this.config.get<string>('mode'),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe. Hits the master DB and confirms migrations have run.
   * Returns 503 when any required check fails.
   *
   * Per-tenant DB checks are intentionally omitted — a single tenant DB
   * being down should fail individual requests, not flip the whole pod
   * to Not-Ready.
   */
  @ApiOperation({ summary: "Readiness probe — master DB + migrations check; 503 when degraded." })
  @Get('ready')
  async ready() {
    const report: ReadyReport = {
      status: 'ok',
      checks: {
        masterDb: false,
        migrationsApplied: false,
        hederaConfigured:
          (this.config.get<boolean>('hedera.enabled') ?? false) ? true : 'stubbed',
      },
      details: {},
      timestamp: new Date().toISOString(),
    };

    try {
      await this.masterDs.query('SELECT 1');
      report.checks.masterDb = true;
    } catch (err) {
      report.details.masterDb = err instanceof Error ? err.message : String(err);
    }

    if (report.checks.masterDb) {
      try {
        // The `master_migrations` table is created by TypeORM on first
        // `migration:run` (custom name from `master-data-source.ts`). Its
        // absence means the master DB hasn't been bootstrapped yet.
        const rows: Array<{ exists: boolean }> = await this.masterDs.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_migrations') AS exists`,
        );
        report.checks.migrationsApplied = rows[0]?.exists ?? false;
        if (!report.checks.migrationsApplied) {
          report.details.migrationsApplied =
            'migrations table not found — run npm run migration:master:run';
        }
      } catch (err) {
        report.details.migrationsApplied = err instanceof Error ? err.message : String(err);
      }
    }

    const ok = report.checks.masterDb && report.checks.migrationsApplied;
    if (!ok) {
      report.status = 'degraded';
      throw new HttpException(report, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
