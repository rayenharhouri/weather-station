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
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import {
  CreateDatasetDto,
  ListDatasetsQueryDto,
} from './dto/datasets.dto';
import { Dataset, DatasetFormat } from './entities/dataset.entity';
import { DatasetsService } from './datasets.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface V1Dataset {
  id: string;
  owner_id: string | null;
  title: string;
  description: string;
  visibility: Dataset['visibility'];
  metric: string;
  station_name: string;
  station_id: string | null;
  window_start: string;
  window_end: string;
  record_count: number;
  size_bytes: number;
  formats: DatasetFormat[];
  citation: string | null;
  playground_href: string | null;
  created_at: string;
  updated_at: string;
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/datasets')
export class DatasetsController {
  constructor(private readonly datasets: DatasetsService) {}

  @ApiOperation({ summary: "List datasets visible to the user." })
  @Get()
  async list(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Query() query: ListDatasetsQueryDto,
  ): Promise<{ data: V1Dataset[]; next_cursor: null }> {
    const rows = await this.datasets.list(tenant.slug, user.id, {
      visibility: query.visibility,
      q: query.q,
    });
    return { data: rows.map(toV1Dataset), next_cursor: null };
  }

  @ApiOperation({ summary: "Save a new dataset (from the Playground)." })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Body() body: CreateDatasetDto,
  ): Promise<{ data: V1Dataset }> {
    const ds = await this.datasets.create(tenant.slug, user.id, body);
    return { data: toV1Dataset(ds) };
  }

  @ApiOperation({ summary: "Delete a dataset you own." })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.datasets.delete(tenant.slug, user.id, id);
  }

  @ApiOperation({ summary: "Download a dataset (metadata-CSV stub until 3.4 streaming export)." })
  @Get(':id/download')
  async download(
    @CurrentUser() user: User,
    @CurrentTenant() tenant: Tenant,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const ds = await this.datasets.get(tenant.slug, user.id, id);
    if (!ds) throw new NotFoundException(`Dataset '${id}' not found`);
    const safeName = ds.title.replace(/[^a-z0-9-]+/gi, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    res.write(`# dataset_id,${ds.id}\n`);
    res.write(`# title,${ds.title}\n`);
    res.write(`# metric,${ds.metric}\n`);
    res.write(`# window_start,${ds.windowStart.toISOString()}\n`);
    res.write(`# window_end,${ds.windowEnd.toISOString()}\n`);
    res.write(`# record_count,${ds.recordCount}\n`);
    res.write(
      `# NOTE: materialised export bodies arrive with the exports module (Phase 3.4).\n`,
    );
    res.end();
  }
}

function toV1Dataset(d: Dataset): V1Dataset {
  return {
    id: d.id,
    owner_id: d.ownerId,
    title: d.title,
    description: d.description,
    visibility: d.visibility,
    metric: d.metric,
    station_name: d.stationName,
    station_id: d.stationId,
    window_start: d.windowStart.toISOString(),
    window_end: d.windowEnd.toISOString(),
    record_count: d.recordCount,
    size_bytes: Number(d.sizeBytes),
    formats: d.formats,
    citation: d.citation,
    playground_href: d.playgroundHref,
    created_at: d.createdAt.toISOString(),
    updated_at: d.updatedAt.toISOString(),
  };
}
