import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  slug!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location!: string | null;

  @Index({ unique: true, where: '"emailDomain" IS NOT NULL' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  emailDomain!: string | null;

  @Column({ type: 'varchar', length: 128 })
  dbName!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  hederaAccountId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  hederaTopicId!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
