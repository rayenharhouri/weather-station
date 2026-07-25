import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { Alert } from './entities/alert.entity';
import { AlertsStreamService } from './alerts-stream.service';
import { evaluateReading } from './threshold-evaluator';
import { ListAlertsQueryDto } from './dto/list-alerts.query';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly stream: AlertsStreamService,
  ) {}

  private async repo(tenantSlug: string): Promise<Repository<Alert>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(Alert);
  }

  async list(tenantSlug: string, query: ListAlertsQueryDto): Promise<Alert[]> {
    const repo = await this.repo(tenantSlug);
    const where: FindOptionsWhere<Alert> = {};
    if (query.stationId) where.stationId = query.stationId;
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.from && query.to) {
      where.triggeredAt = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.triggeredAt = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.triggeredAt = LessThanOrEqual(new Date(query.to));
    }
    return repo.find({ where, order: { triggeredAt: 'DESC' }, take: 200 });
  }

  async acknowledge(
    tenantSlug: string,
    alertId: string,
    userId: string,
  ): Promise<Alert> {
    const repo = await this.repo(tenantSlug);
    const alert = await repo.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException(`Alert '${alertId}' not found`);
    if (alert.status === 'resolved') return alert;
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;
    return repo.save(alert);
  }

  async resolve(
    tenantSlug: string,
    alertId: string,
    userId: string,
  ): Promise<Alert> {
    const repo = await this.repo(tenantSlug);
    const alert = await repo.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException(`Alert '${alertId}' not found`);
    if (alert.status === 'resolved') return alert;
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = userId;
    // If never acknowledged, fold the ack timestamp in too so the timeline
    // stays consistent. Some operators jump straight to resolve.
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = alert.resolvedAt;
      alert.acknowledgedBy = userId;
    }
    return repo.save(alert);
  }

  /**
   * Threshold-evaluator entry point called by `ReadingsService.ingest()`
   * after a reading lands. Persists one alert row per breach, pushes each
   * onto the SSE channel, and swallows errors so a flaky alert write
   * never blocks an ingest. Returns the alerts created (mostly for tests).
   */
  async evaluateAndPublish(
    tenantSlug: string,
    reading: WeatherReading,
  ): Promise<Alert[]> {
    const breaches = evaluateReading(reading);
    if (breaches.length === 0) return [];

    let repo: Repository<Alert>;
    try {
      repo = await this.repo(tenantSlug);
    } catch (err) {
      this.logger.warn(
        `[${tenantSlug}] alert evaluator skipped: tenant DataSource unavailable: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }

    // Skip-if-open: don't re-fire an identical (stationId, metric, severity)
    // alert while one is still unresolved. Operators acknowledge → it stays
    // open in dedupe terms until they hit resolve.
    const openByKey = await this.findOpenByKeys(repo, reading.stationId, breaches.map((b) => ({ metric: b.metric, severity: b.severity })));

    const created: Alert[] = [];
    for (const breach of breaches) {
      const dedupeKey = `${breach.metric}|${breach.severity}`;
      if (openByKey.has(dedupeKey)) continue;
      try {
        const alert = repo.create({
          stationId: reading.stationId,
          metric: breach.metric,
          threshold: breach.threshold,
          actualValue: breach.actualValue,
          severity: breach.severity,
          status: 'open',
          message: breach.message,
          triggeredAt: reading.recordedAt,
        });
        const saved = await repo.save(alert);
        created.push(saved);
        this.stream.publish(tenantSlug, saved);
      } catch (err) {
        this.logger.error(
          `[${tenantSlug}] failed to persist alert for ${reading.stationId}/${breach.metric}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return created;
  }

  private async findOpenByKeys(
    repo: Repository<Alert>,
    stationId: string,
    keys: Array<{ metric: string; severity: Alert['severity'] }>,
  ): Promise<Set<string>> {
    if (keys.length === 0) return new Set();
    const rows = await repo
      .createQueryBuilder('a')
      .select(['a.metric', 'a.severity'])
      .where('a."stationId" = :stationId', { stationId })
      .andWhere('a.status IN (:...statuses)', { statuses: ['open', 'acknowledged'] })
      .andWhere('a.metric IN (:...metrics)', { metrics: keys.map((k) => k.metric) })
      .getMany();
    return new Set(rows.map((r) => `${r.metric}|${r.severity}`));
  }
}
