import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Response } from 'express';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { CreateExportDto } from './dto/exports.dto';
import { ExportFormat, ExportJob, ExportStatus } from './entities/export-job.entity';
import { ExportsService } from './exports.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface V1Export {
  id: string;
  name: string;
  metric: string;
  station_id: string | null;
  station_name: string;
  window_start: string;
  window_end: string;
  format: ExportFormat;
  status: ExportStatus;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  expires_at: string | null;
  record_count: number | null;
  size_bytes: number | null;
  progress_pct: number;
  error_message: string | null;
}

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: 'text/csv',
  json: 'application/json',
  parquet: 'application/octet-stream',
};

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/exports')
export class ExportsController {
  constructor(private readonly exports: ExportsService) {}

  @ApiOperation({ summary: "List the caller's export jobs." })
  @Get()
  async list(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
  ): Promise<{ data: V1Export[]; next_cursor: null }> {
    const rows = await this.exports.list(tenant.slug, user.id);
    return { data: rows.map(toV1Export), next_cursor: null };
  }

  @ApiOperation({ summary: "Queue a new export job (returns immediately, materialised async)." })
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Body() body: CreateExportDto,
  ): Promise<{ data: V1Export }> {
    const job = await this.exports.create(tenant.slug, user.id, body);
    return { data: toV1Export(job) };
  }

  /**
   * Cancel a queued/running job. Idempotent: calling on an already-finished
   * job is a no-op.
   */
  @ApiOperation({ summary: "Cancel a queued/running job; idempotent." })
  @Post(':id/cancel')
  async cancel(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<{ data: V1Export }> {
    const job = await this.exports.cancel(tenant.slug, user.id, id);
    return { data: toV1Export(job) };
  }

  @ApiOperation({ summary: "Delete a finished job + its file from disk." })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.exports.delete(tenant.slug, user.id, id);
  }

  @ApiOperation({ summary: "Stream the materialised export file." })
  @Get(':id/download')
  async download(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const job = await this.exports.get(tenant.slug, user.id, id);
    if (job.status !== 'ready' || !job.filePath) {
      throw new NotFoundException(`Export '${id}' is not ready for download`);
    }
    // Verify the file is still on disk — TTL cleanup might've removed it.
    await stat(job.filePath).catch(() => {
      throw new NotFoundException(`Export '${id}' file no longer available`);
    });

    const safeName = job.name.replace(/[^a-z0-9-]+/gi, '_').toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPE[job.format]);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}.${job.format}"`,
    );
    createReadStream(job.filePath).pipe(res);
  }
}

function toV1Export(j: ExportJob): V1Export {
  return {
    id: j.id,
    name: j.name,
    metric: j.metric,
    station_id: j.stationId,
    station_name: j.stationName,
    window_start: j.windowStart.toISOString(),
    window_end: j.windowEnd.toISOString(),
    format: j.format,
    status: j.status,
    requested_at: j.requestedAt.toISOString(),
    started_at: j.startedAt ? j.startedAt.toISOString() : null,
    finished_at: j.finishedAt ? j.finishedAt.toISOString() : null,
    expires_at: j.expiresAt ? j.expiresAt.toISOString() : null,
    record_count: j.recordCount,
    size_bytes: j.sizeBytes != null ? Number(j.sizeBytes) : null,
    progress_pct: j.progressPct,
    error_message: j.errorMessage,
  };
}
