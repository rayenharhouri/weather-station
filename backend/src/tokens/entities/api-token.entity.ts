import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ApiTokenStatus = 'active' | 'revoked' | 'expired';

export interface ApiTokenScope {
  /** Empty = home-tenant default. ['*'] = all stations (cross-tenant). */
  stations: string[];
  /** Empty = all metrics. */
  metrics: string[];
  readOnly: boolean;
  /** Marker for the UI; cross-tenant access still requires explicit grants. */
  crossTenant?: boolean;
}

/**
 * API token for the Researcher portal. Lives in the tenant DB and is owned by
 * a user (`userId`). The plaintext token is shown exactly once on creation
 * and never stored — we keep a SHA-256 hash for indexed lookup at request
 * time, and the last 4 characters as a `suffix` for display in lists.
 */
@Entity({ name: 'api_tokens' })
export class ApiToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /**
   * SHA-256 hex digest of the plaintext token. Indexed so the auth guard
   * can resolve incoming tokens with a single point-lookup. The plaintext
   * itself is never persisted.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  hashedToken!: string;

  /** Last 4 chars of the plaintext token — display-only. */
  @Column({ type: 'varchar', length: 4 })
  suffix!: string;

  @Column({ type: 'jsonb', default: () => `'{"stations":[],"metrics":[],"readOnly":true}'::jsonb` })
  scope!: ApiTokenScope;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: ApiTokenStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ type: 'integer', default: 0 })
  requestsTotal!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
