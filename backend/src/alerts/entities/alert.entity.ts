import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

@Entity({ name: 'alerts' })
@Index('IDX_alerts_station_triggered', ['stationId', 'triggeredAt'])
@Index('IDX_alerts_status', ['status'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  stationId!: string;

  @Column({ type: 'varchar', length: 32 })
  metric!: string;

  @Column({ type: 'double precision' })
  threshold!: number;

  @Column({ type: 'double precision' })
  actualValue!: number;

  @Column({ type: 'varchar', length: 16 })
  severity!: AlertSeverity;

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: AlertStatus;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'timestamptz' })
  triggeredAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
