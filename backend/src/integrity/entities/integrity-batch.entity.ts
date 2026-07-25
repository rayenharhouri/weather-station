import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One Merkle batch covering a contiguous slice of a station's readings.
 *
 * A batch is created when the anchor scheduler (Phase 5.4) wakes up and
 * collects every reading newer than the previous batch's `timeWindowEnd`.
 * For Phase 1.4 batches are produced on-demand via the integrity service —
 * the scheduler just automates the trigger.
 *
 * Hedera fields are populated when `hedera.enabled=true` in config; in
 * `demo` mode they hold deterministic stub values so the UI renders
 * the verification flow end-to-end without a testnet connection.
 *
 * Shape mirrors [IntegrityBatchSchema](../../../../lib/validation.ts).
 */
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

  /** Hex digest of the Merkle root. Hex (not base64) for easy copy-paste. */
  @Column({ type: 'varchar', length: 64 })
  merkleRoot!: string;

  /** SHA-256 of the canonical concatenation of all leaves — sanity check. */
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

  /**
   * True when this batch's Hedera fields came from the deterministic local
   * stub (no real network call), false when they came from a genuine HCS
   * submit. Lets the UI tell "anchored to the real chain, mirror
   * confirmation pending" apart from "never left this machine" instead of
   * conflating both under `mirrorNodeVerified`.
   */
  @Column({ type: 'boolean', default: true })
  simulated!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
