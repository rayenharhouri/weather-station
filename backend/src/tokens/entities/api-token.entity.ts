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
  stations: string[];
  metrics: string[];
  readOnly: boolean;
  crossTenant?: boolean;
}

@Entity({ name: 'api_tokens' })
export class ApiToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  hashedToken!: string;

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
