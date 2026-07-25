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

/**
 * Per-user copy of the operations alert thresholds — the values that
 * power the `/settings` page sliders. Stored as numbers (rather than the
 * page's display strings) so the API surface is canonical regardless of
 * locale.
 *
 * The global `evaluateReading` rule table in
 * [threshold-evaluator.ts](../../alerts/threshold-evaluator.ts) does not
 * read from here yet — Phase 5+ wires per-user overrides into the
 * evaluator. Until then this is a UX-only knob.
 */
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

/**
 * Per-user preferences for the researcher portal. Lives in the tenant DB,
 * one row per user. Missing rows are returned as defaults by
 * `AccountService.get()` — we only persist on first PATCH.
 *
 * Profile fields (name, email) stay on `users` and are served by `/v1/me`.
 * This entity holds only what the user can change from `/research/account`.
 */
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

  /** Token the user is currently "acting as" — follows them across devices. */
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
