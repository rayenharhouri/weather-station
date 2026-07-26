import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { createHash } from 'node:crypto';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { TenantService } from '../tenancy/tenant.service';
import { HederaAnchorService } from './hedera-anchor.service';
import {
  hashReading,
  inclusionProof,
  merkleRoot,
  verifyProof,
} from './merkle';
import { IntegrityBatch } from './entities/integrity-batch.entity';

export interface RecordVerificationResult {
  recordId: string;
  stationId: string;
  recordHash: string;
  computedHash: string;
  hashMatch: boolean;
  batchId?: string;
  batchMembership: boolean;
  hederaTopicId?: string;
  hederaSequenceNumber?: number;
  hederaTransactionId?: string;
  consensusTimestamp?: string;
  mirrorNodeVerified: boolean;
  simulated?: boolean;
  verificationMessage: string;
}

@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly anchor: HederaAnchorService,
  ) {}

  private async batchRepo(tenantSlug: string): Promise<Repository<IntegrityBatch>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(IntegrityBatch);
  }

  private async readingRepo(tenantSlug: string): Promise<Repository<WeatherReading>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(WeatherReading);
  }

  async listBatches(
    tenantSlug: string,
    filters: { stationId?: string; from?: string; to?: string },
  ): Promise<IntegrityBatch[]> {
    const repo = await this.batchRepo(tenantSlug);
    const where: FindOptionsWhere<IntegrityBatch> = {};
    if (filters.stationId) where.stationId = filters.stationId;
    if (filters.from && filters.to) {
      where.timeWindowEnd = Between(new Date(filters.from), new Date(filters.to));
    } else if (filters.from) {
      where.timeWindowEnd = MoreThanOrEqual(new Date(filters.from));
    } else if (filters.to) {
      where.timeWindowEnd = LessThanOrEqual(new Date(filters.to));
    }
    return repo.find({ where, order: { timeWindowEnd: 'DESC' }, take: 200 });
  }

  async getBatch(tenantSlug: string, batchId: string): Promise<IntegrityBatch> {
    const repo = await this.batchRepo(tenantSlug);
    const batch = await repo.findOne({ where: { id: batchId } });
    if (!batch) throw new NotFoundException(`Batch '${batchId}' not found`);
    return batch;
  }

  async verifyRecord(
    tenantSlug: string,
    recordId: string,
  ): Promise<RecordVerificationResult> {
    const readingRepo = await this.readingRepo(tenantSlug);
    const reading = await readingRepo.findOne({ where: { id: recordId } });
    if (!reading) {
      throw new NotFoundException(`Reading '${recordId}' not found`);
    }

    const computedHash = hashReading(reading);
    const batchRepo = await this.batchRepo(tenantSlug);
    const batch = await batchRepo
      .createQueryBuilder('b')
      .where('b."stationId" = :stationId', { stationId: reading.stationId })
      .andWhere('b."timeWindowStart" <= :t', { t: reading.recordedAt })
      .andWhere('b."timeWindowEnd" >= :t', { t: reading.recordedAt })
      .orderBy('b."timeWindowEnd"', 'DESC')
      .limit(1)
      .getOne();

    if (!batch) {
      return {
        recordId,
        stationId: reading.stationId,
        recordHash: computedHash,
        computedHash,
        hashMatch: true,
        batchMembership: false,
        mirrorNodeVerified: false,
        verificationMessage:
          'Record is authentic locally but has not been anchored to a Merkle batch yet. Try again after the next anchor run.',
      };
    }

    const leaves = await this.leavesForBatch(tenantSlug, batch);
    const idx = leaves.findIndex((l) => l.id === recordId);
    if (idx < 0) {
      return {
        recordId,
        stationId: reading.stationId,
        recordHash: computedHash,
        computedHash,
        hashMatch: false,
        batchId: batch.id,
        batchMembership: false,
        hederaTopicId: batch.hederaTopicId,
        hederaSequenceNumber: batch.hederaSequenceNumber,
        hederaTransactionId: batch.hederaTransactionId,
        consensusTimestamp: batch.consensusTimestamp.toISOString(),
        mirrorNodeVerified: batch.mirrorNodeVerified,
        simulated: batch.simulated,
        verificationMessage:
          'Record claims membership in a batch but was not found among its leaves — possible tampering or batch drift.',
      };
    }

    const leafHash = leaves[idx].hash;
    const proof = inclusionProof(leaves.map((l) => l.hash), idx);
    const hashMatch = leafHash === computedHash;
    const proofValid = verifyProof(leafHash, proof, batch.merkleRoot);

    return {
      recordId,
      stationId: reading.stationId,
      recordHash: leafHash,
      computedHash,
      hashMatch,
      batchId: batch.id,
      batchMembership: proofValid,
      hederaTopicId: batch.hederaTopicId,
      hederaSequenceNumber: batch.hederaSequenceNumber,
      hederaTransactionId: batch.hederaTransactionId,
      consensusTimestamp: batch.consensusTimestamp.toISOString(),
      mirrorNodeVerified: batch.mirrorNodeVerified,
      simulated: batch.simulated,
      verificationMessage: messageFor(hashMatch, proofValid),
    };
  }

  async verifyBatch(tenantSlug: string, batchId: string): Promise<IntegrityBatch> {
    const batchRepo = await this.batchRepo(tenantSlug);
    const batch = await this.getBatch(tenantSlug, batchId);
    const leaves = await this.leavesForBatch(tenantSlug, batch);
    if (leaves.length === 0) {
      throw new BadRequestException(
        `Batch '${batchId}' covers no readings — cannot verify a Merkle root over zero leaves.`,
      );
    }
    const recomputed = merkleRoot(leaves.map((l) => l.hash));
    if (recomputed !== batch.merkleRoot) {
      this.logger.warn(
        `[${tenantSlug}] batch ${batchId} root mismatch — stored=${batch.merkleRoot} recomputed=${recomputed}`,
      );
      return batch;
    }
    batch.verifiedAt = new Date();
    return batchRepo.save(batch);
  }

  async createBatch(
    tenantSlug: string,
    stationId: string,
  ): Promise<IntegrityBatch | null> {
    const batchRepo = await this.batchRepo(tenantSlug);
    const readingRepo = await this.readingRepo(tenantSlug);

    const lastBatch = await batchRepo.findOne({
      where: { stationId },
      order: { timeWindowEnd: 'DESC' },
    });
    const windowStart = lastBatch?.timeWindowEnd ?? new Date(0);
    const windowEnd = new Date();

    const readings = await readingRepo
      .createQueryBuilder('r')
      .where('r."stationId" = :stationId', { stationId })
      .andWhere('r."recordedAt" > :start', { start: windowStart })
      .andWhere('r."recordedAt" <= :end', { end: windowEnd })
      .orderBy('r."recordedAt"', 'ASC')
      .getMany();

    if (readings.length === 0) return null;

    const leafHashes = readings.map(hashReading);
    const root = merkleRoot(leafHashes);
    const dataHash = createHash('sha256').update(leafHashes.join('')).digest('hex');

    const anchor = await this.anchor.submitRoot(tenantSlug, root);

    const batch = batchRepo.create({
      stationId,
      timeWindowStart: readings[0].recordedAt,
      timeWindowEnd: readings[readings.length - 1].recordedAt,
      recordCount: readings.length,
      merkleRoot: root,
      dataHash,
      hederaTopicId: anchor.topicId,
      hederaSequenceNumber: anchor.sequenceNumber,
      hederaTransactionId: anchor.transactionId,
      consensusTimestamp: anchor.consensusTimestamp,
      mirrorNodeVerified: anchor.mirrorNodeVerified,
      simulated: anchor.simulated,
      verifiedAt: null,
    });
    return batchRepo.save(batch);
  }

  private async leavesForBatch(
    tenantSlug: string,
    batch: IntegrityBatch,
  ): Promise<Array<{ id: string; hash: string }>> {
    const readingRepo = await this.readingRepo(tenantSlug);
    const readings = await readingRepo
      .createQueryBuilder('r')
      .where('r."stationId" = :stationId', { stationId: batch.stationId })
      .andWhere('r."recordedAt" >= :start', { start: batch.timeWindowStart })
      .andWhere('r."recordedAt" <= :end', { end: batch.timeWindowEnd })
      .orderBy('r."recordedAt"', 'ASC')
      .getMany();
    return readings.map((r) => ({ id: r.id, hash: hashReading(r) }));
  }
}

function messageFor(hashMatch: boolean, proofValid: boolean): string {
  if (hashMatch && proofValid) {
    return 'Record hash matches the anchored leaf and the Merkle proof reconstructs the on-chain root. Data integrity verified.';
  }
  if (!hashMatch && proofValid) {
    return 'Anchored leaf was found in the Merkle tree, but its hash differs from the live record. The record has been modified after anchoring.';
  }
  if (hashMatch && !proofValid) {
    return 'Record hash matches the anchored leaf but the proof does not reconstruct the stored root — batch metadata may have drifted.';
  }
  return 'Neither hash nor proof verifies — the record appears to be tampered with or no longer part of its original batch.';
}
