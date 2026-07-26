import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DatasetVisibility = 'public' | 'private' | 'shared';
export type DatasetFormat = 'csv' | 'json' | 'parquet';

@Entity({ name: 'datasets' })
@Index('IDX_datasets_owner', ['ownerId'])
@Index('IDX_datasets_visibility', ['visibility'])
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 16 })
  visibility!: DatasetVisibility;

  @Column({ type: 'varchar', length: 32 })
  metric!: string;

  @Column({ type: 'varchar', length: 200 })
  stationName!: string;

  @Column({ type: 'uuid', nullable: true })
  stationId!: string | null;

  @Column({ type: 'timestamptz' })
  windowStart!: Date;

  @Column({ type: 'timestamptz' })
  windowEnd!: Date;

  @Column({ type: 'integer' })
  recordCount!: number;

  @Column({ type: 'bigint' })
  sizeBytes!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  formats!: DatasetFormat[];

  @Column({ type: 'varchar', length: 200, nullable: true })
  citation!: string | null;

  @Column({ type: 'text', nullable: true })
  playgroundHref!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
