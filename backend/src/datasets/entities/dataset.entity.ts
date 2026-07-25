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

/**
 * Saved query → reusable dataset. Researchers create these from the
 * Playground (`/research/playground` → "Save dataset"); other researchers
 * see them on `/research/datasets`.
 *
 * Lives in the tenant DB. Cross-tenant visibility (the "shared" tab) is a
 * future overlay — for now `shared` rows are stored alongside `public`
 * and `private` and treated as a free-text label.
 *
 * Shape mirrors the frontend `Dataset` interface so the page can render
 * rows without translation.
 */
@Entity({ name: 'datasets' })
@Index('IDX_datasets_owner', ['ownerId'])
@Index('IDX_datasets_visibility', ['visibility'])
export class Dataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Author of the saved query. Nullable for system-curated datasets. */
  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 16 })
  visibility!: DatasetVisibility;

  /** `multi` is allowed and means the dataset spans more than one metric. */
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

  /** Deep-link back into the Playground. Optional — only set when saved from there. */
  @Column({ type: 'text', nullable: true })
  playgroundHref!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
