import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One row per authenticated `/v1/*` request. Powers `GET /v1/usage` —
 * KPIs, per-token traffic, top endpoints, latency percentiles.
 *
 * Lives in the tenant DB so per-tenant usage is naturally isolated.
 * Pruned after 90 days by a cron in Phase 5.3.
 */
@Entity({ name: 'request_logs' })
@Index('IDX_request_logs_timestamp', ['timestamp'])
@Index('IDX_request_logs_token_time', ['tokenId', 'timestamp'])
@Index('IDX_request_logs_path_time', ['path', 'timestamp'])
export class RequestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tokenId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 8 })
  method!: string;

  /**
   * The route template, e.g. `GET /v1/readings` — NOT the raw URL. Query
   * strings and dynamic segments are stripped so we can group cleanly in
   * the top-endpoints aggregation.
   */
  @Column({ type: 'varchar', length: 200 })
  path!: string;

  @Column({ type: 'integer' })
  statusCode!: number;

  @Column({ type: 'integer' })
  latencyMs!: number;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;
}
