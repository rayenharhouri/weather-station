import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ExportStatus = 'queued' | 'running' | 'ready' | 'failed' | 'expired';
export type ExportFormat = 'csv' | 'json' | 'parquet';

@Entity({ name: 'exports' })
@Index('IDX_exports_status', ['status'])
@Index('IDX_exports_user_requested', ['userId', 'requestedAt'])
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  metric!: string;

  @Column({ type: 'uuid', nullable: true })
  stationId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  stationName!: string;

  @Column({ type: 'timestamptz' })
  windowStart!: Date;

  @Column({ type: 'timestamptz' })
  windowEnd!: Date;

  @Column({ type: 'varchar', length: 16 })
  format!: ExportFormat;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status!: ExportStatus;

  @Column({ type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'integer', nullable: true })
  recordCount!: number | null;

  @Column({ type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @Column({ type: 'real', default: 0 })
  progressPct!: number;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'text', nullable: true })
  filePath!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
