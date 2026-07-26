import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CitationFormat = 'apa' | 'mla' | 'chicago' | 'bibtex';

export interface NotificationPreferences {
  weeklyDigest: boolean;
  rateLimitWarnings: boolean;
  breakingChanges: boolean;
  anchorCompletion: boolean;
  grantUpdates: boolean;
}

export interface AlertThresholds {
  tempCriticalC: number;
  humidityWarnPct: number;
  pressureLowHpa: number;
  rainfallHourlyMm: number;
}

export interface OpsNotificationPreferences {
  alertsEmail: boolean;
  dailyReport: boolean;
  weeklyReport: boolean;
}

@Entity({ name: 'account_preferences' })
export class AccountPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb', default: () => `'${JSON.stringify(DEFAULT_NOTIFICATIONS)}'::jsonb` })
  notifications!: NotificationPreferences;

  @Column({ type: 'varchar', length: 16, default: 'apa' })
  citationFormat!: CitationFormat;

  @Column({ type: 'boolean', default: true })
  autoCite!: boolean;

  @Column({ type: 'uuid', nullable: true })
  activeTokenId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  orcid!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  affiliation!: string | null;

  @Column({
    type: 'jsonb',
    default: () => `'${JSON.stringify(DEFAULT_THRESHOLDS)}'::jsonb`,
  })
  thresholds!: AlertThresholds;

  @Column({
    type: 'jsonb',
    default: () => `'${JSON.stringify(DEFAULT_OPS_NOTIFICATIONS)}'::jsonb`,
  })
  opsNotifications!: OpsNotificationPreferences;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  weeklyDigest: true,
  rateLimitWarnings: true,
  breakingChanges: true,
  anchorCompletion: false,
  grantUpdates: true,
};

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  tempCriticalC: 35,
  humidityWarnPct: 80,
  pressureLowHpa: 990,
  rainfallHourlyMm: 10,
};

export const DEFAULT_OPS_NOTIFICATIONS: OpsNotificationPreferences = {
  alertsEmail: true,
  dailyReport: false,
  weeklyReport: true,
};
