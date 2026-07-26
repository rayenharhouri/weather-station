import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type GrantStatus = 'pending' | 'active' | 'revoked';

@Entity({ name: 'grants' })
@Index('IDX_grants_user_status', ['userId', 'status'])
export class Grant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  targetTenantSlug!: string;

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
