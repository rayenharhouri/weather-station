import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { IntegrityBatch } from '../integrity/entities/integrity-batch.entity';
import { IntegrityService, RecordVerificationResult } from '../integrity/integrity.service';
import { assertStationInScope } from './scope';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

class V1BatchesQueryDto {
  @IsOptional()
  @IsUUID()
  station?: string;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;
}

class V1VerifyRecordDto {
  @IsString()
  @IsNotEmpty()
  record_id!: string;
}

interface V1Batch {
  id: string;
  station_id: string;
  time_window_start: string;
  time_window_end: string;
  record_count: number;
  merkle_root: string;
  data_hash: string;
  hedera_topic_id: string;
  hedera_sequence_number: number;
  hedera_transaction_id: string;
  consensus_timestamp: string;
  mirror_node_verified: boolean;
  simulated: boolean;
  verified_at: string | null;
}

interface V1VerificationResult {
  record_id: string;
  station_id: string;
  record_hash: string;
  computed_hash: string;
  hash_match: boolean;
  batch_id: string | null;
  batch_membership: boolean;
  hedera_topic_id: string | null;
  hedera_sequence_number: number | null;
  hedera_transaction_id: string | null;
  consensus_timestamp: string | null;
  mirror_node_verified: boolean;
  simulated: boolean | null;
  verification_message: string;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/integrity')
export class ResearchIntegrityController {
  constructor(private readonly integrity: IntegrityService) {}

  @ApiOperation({ summary: "Integrity batches the token can see." })
  @Get('batches')
  async listBatches(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Query() query: V1BatchesQueryDto,
  ): Promise<{ data: V1Batch[]; next_cursor: null }> {
    if (query.station) assertStationInScope(token, query.station);

    const rows = await this.integrity.listBatches(tenant.slug, {
      stationId: query.station,
      from: query.since,
      to: query.until,
    });

    const { scope } = token;
    const inScope = (stationId: string): boolean => {
      if (scope.stations.length === 0) return true;
      if (scope.stations.includes('*')) return scope.crossTenant === true;
      return scope.stations.includes(stationId);
    };

    return {
      data: rows.filter((b) => inScope(b.stationId)).map(toV1Batch),
      next_cursor: null,
    };
  }

  @ApiOperation({ summary: "Verify a record; resolved station scope-checked." })
  @Post('verify-record')
  async verifyRecord(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
    @Body() body: V1VerifyRecordDto,
  ): Promise<{ data: V1VerificationResult }> {
    const result = await this.integrity.verifyRecord(tenant.slug, body.record_id);
    assertStationInScope(token, result.stationId);
    return { data: toV1Verification(result) };
  }
}

function toV1Batch(b: IntegrityBatch): V1Batch {
  return {
    id: b.id,
    station_id: b.stationId,
    time_window_start: b.timeWindowStart.toISOString(),
    time_window_end: b.timeWindowEnd.toISOString(),
    record_count: b.recordCount,
    merkle_root: b.merkleRoot,
    data_hash: b.dataHash,
    hedera_topic_id: b.hederaTopicId,
    hedera_sequence_number: b.hederaSequenceNumber,
    hedera_transaction_id: b.hederaTransactionId,
    consensus_timestamp: b.consensusTimestamp.toISOString(),
    mirror_node_verified: b.mirrorNodeVerified,
    simulated: b.simulated,
    verified_at: b.verifiedAt ? b.verifiedAt.toISOString() : null,
  };
}

function toV1Verification(r: RecordVerificationResult): V1VerificationResult {
  return {
    record_id: r.recordId,
    station_id: r.stationId,
    record_hash: r.recordHash,
    computed_hash: r.computedHash,
    hash_match: r.hashMatch,
    batch_id: r.batchId ?? null,
    batch_membership: r.batchMembership,
    hedera_topic_id: r.hederaTopicId ?? null,
    hedera_sequence_number: r.hederaSequenceNumber ?? null,
    hedera_transaction_id: r.hederaTransactionId ?? null,
    consensus_timestamp: r.consensusTimestamp ?? null,
    mirror_node_verified: r.mirrorNodeVerified,
    simulated: r.simulated ?? null,
    verification_message: r.verificationMessage,
  };
}
