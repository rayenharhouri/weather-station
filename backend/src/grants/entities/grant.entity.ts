import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type GrantStatus = 'pending' | 'active' | 'revoked';

/**
 * A cross-tenant access grant: researcher in tenant A asks to read data
 * from tenant B; tenant B's admin can approve (status: `active`), leave
 * it `pending`, or revoke it later.
 *
 * Stored in the *requesting* tenant's DB — every researcher sees their
 * own grants on `/research/account`. Approval flow + the tenant-admin
 * surface for incoming requests is out of scope here (Phase 5+ work).
 *
 * `targetTenantSlug` is the human slug of the tenant being asked, since
 * cross-tenant ids aren't unified.
 */
@Entity({ name: 'grants' })
@Index('IDX_grants_user_status', ['userId', 'status'])
export class Grant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  targetTenantSlug!: string;

  /** Free-text scope description — e.g. "light readings · all stations · 12 months". */
  @Column({ type: 'text' })
  scope!: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: GrantStatus;

  @Column({ type: 'timestamptz', nullable: true })
  grantedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
