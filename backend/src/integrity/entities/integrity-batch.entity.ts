import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'integrity_batches' })
@Index('IDX_integrity_station_window', ['stationId', 'timeWindowEnd'])
export class IntegrityBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  stationId!: string;

  @Column({ type: 'timestamptz' })
  timeWindowStart!: Date;

  @Column({ type: 'timestamptz' })
  timeWindowEnd!: Date;

  @Column({ type: 'integer' })
  recordCount!: number;

  @Column({ type: 'varchar', length: 64 })
  merkleRoot!: string;

  @Column({ type: 'varchar', length: 64 })
  dataHash!: string;

  @Column({ type: 'varchar', length: 64 })
  hederaTopicId!: string;

  @Column({ type: 'integer' })
  hederaSequenceNumber!: number;

  @Column({ type: 'varchar', length: 128 })
  hederaTransactionId!: string;

  @Column({ type: 'timestamptz' })
  consensusTimestamp!: Date;

  @Column({ type: 'boolean', default: false })
  mirrorNodeVerified!: boolean;

  @Column({ type: 'boolean', default: true })
  simulated!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
