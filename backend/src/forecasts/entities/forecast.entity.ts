import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ForecastHorizon = '1h' | '3h' | '6h' | '24h';

export interface ForecastItem {
  timestamp: string;
  metric: 'temperature' | 'humidity' | 'pressure' | 'rainfall';
  predictedValue: number;
  confidence: number;
}

/**
 * Cached forecast for one `(station, horizon)` pair. Recomputed lazily by
 * the service when `generatedAt` is older than the staleness window.
 *
 * The shape — `items[]`, `confidence`, `explanation` — mirrors the frontend
 * [ForecastSchema](../../../../lib/validation.ts) so a row can be returned
 * verbatim. Phase 5.6 adds a cron that pre-warms the cache instead of the
 * current on-demand compute.
 */
@Entity({ name: 'forecasts' })
@Index('IDX_forecasts_station_horizon', ['stationId', 'horizon'], { unique: true })
export class Forecast {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  stationId!: string;

  @Column({ type: 'varchar', length: 8 })
  horizon!: ForecastHorizon;

  @Column({ type: 'timestamptz' })
  generatedAt!: Date;

  @Column({ type: 'timestamptz' })
  validFrom!: Date;

  @Column({ type: 'timestamptz' })
  validTo!: Date;

  @Column({ type: 'jsonb' })
  items!: ForecastItem[];

  @Column({ type: 'double precision' })
  confidence!: number;

  @Column({ type: 'text' })
  explanation!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
