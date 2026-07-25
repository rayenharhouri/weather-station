import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import {
  ListBatchesQueryDto,
  VerifyBatchDto,
  VerifyRecordDto,
} from './dto/integrity.dto';
import { IntegrityBatch } from './entities/integrity-batch.entity';
import { IntegrityService, RecordVerificationResult } from './integrity.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@UseGuards(JwtAuthGuard)
@ApiTags('integrity')
@ApiBearerAuth('jwt')
@Controller('integrity')
export class IntegrityController {
  constructor(private readonly integrity: IntegrityService) {}

  @ApiOperation({ summary: "List Merkle batches (station / time-window filters)." })
  @Get('batches')
  async list(
    @CurrentTenant() tenant: Tenant,
    @Query() query: ListBatchesQueryDto,
  ): Promise<PaginatedResponse<IntegrityBatch>> {
    const items = await this.integrity.listBatches(tenant.slug, query);
    return { items, total: items.length, page: 1, pageSize: items.length, hasMore: false };
  }

  @ApiOperation({ summary: "Fetch one Merkle batch by id." })
  @Get('batches/:id')
  async detail(
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<IntegrityBatch> {
    return this.integrity.getBatch(tenant.slug, id);
  }

  @ApiOperation({ summary: "Re-hash a record and verify its Merkle inclusion proof." })
  @Post('verify-record')
  async verifyRecord(
    @CurrentTenant() tenant: Tenant,
    @Body() body: VerifyRecordDto,
  ): Promise<RecordVerificationResult> {
    return this.integrity.verifyRecord(tenant.slug, body.recordId);
  }

  @ApiOperation({ summary: "Recompute a batch root from current readings and compare." })
  @Post('verify-batch')
  async verifyBatch(
    @CurrentTenant() tenant: Tenant,
    @Body() body: VerifyBatchDto,
  ): Promise<IntegrityBatch> {
    return this.integrity.verifyBatch(tenant.slug, body.batchId);
  }
}
