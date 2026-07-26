import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, FindOptionsWhere, Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { Dataset, DatasetVisibility } from './entities/dataset.entity';
import { CreateDatasetDto } from './dto/datasets.dto';

@Injectable()
export class DatasetsService {
  constructor(private readonly tenantService: TenantService) {}

  private async repo(tenantSlug: string): Promise<Repository<Dataset>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(Dataset);
  }

  async list(
    tenantSlug: string,
    userId: string,
    filter: { visibility?: DatasetVisibility | 'all'; q?: string },
  ): Promise<Dataset[]> {
    const repo = await this.repo(tenantSlug);
    let qb = repo
      .createQueryBuilder('d')
      .where(
        new Brackets((b) => {
          b.where('d.visibility IN (:...openTo)', { openTo: ['public', 'shared'] })
            .orWhere('d.visibility = :priv AND d."ownerId" = :userId', {
              priv: 'private',
              userId,
            });
        }),
      );

    if (filter.visibility && filter.visibility !== 'all') {
      qb = qb.andWhere('d.visibility = :v', { v: filter.visibility });
    }
    if (filter.q) {
      const needle = `%${filter.q.toLowerCase()}%`;
      qb = qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(d.title) LIKE :q', { q: needle })
            .orWhere('LOWER(d.description) LIKE :q', { q: needle })
            .orWhere('LOWER(d."stationName") LIKE :q', { q: needle });
        }),
      );
    }

    return qb.orderBy('d."updatedAt"', 'DESC').take(200).getMany();
  }

  async get(tenantSlug: string, userId: string, datasetId: string): Promise<Dataset> {
    const repo = await this.repo(tenantSlug);
    const ds = await repo.findOne({ where: { id: datasetId } });
    if (!ds) throw new NotFoundException(`Dataset '${datasetId}' not found`);
    if (ds.visibility === 'private' && ds.ownerId !== userId) {
      throw new NotFoundException(`Dataset '${datasetId}' not found`);
    }
    return ds;
  }

  async create(
    tenantSlug: string,
    userId: string,
    dto: CreateDatasetDto,
  ): Promise<Dataset> {
    const repo = await this.repo(tenantSlug);
    const dataset = repo.create({
      ownerId: userId,
      title: dto.title,
      description: dto.description,
      visibility: dto.visibility,
      metric: dto.metric,
      stationName: dto.station_name,
      stationId: dto.station_id ?? null,
      windowStart: new Date(dto.window_start),
      windowEnd: new Date(dto.window_end),
      recordCount: dto.record_count,
      sizeBytes: String(dto.size_bytes),
      formats: dto.formats,
      citation: dto.citation ?? null,
      playgroundHref: dto.playground_href ?? null,
    });
    return repo.save(dataset);
  }

  async delete(tenantSlug: string, userId: string, datasetId: string): Promise<void> {
    const repo = await this.repo(tenantSlug);
    const ds = await repo.findOne({ where: { id: datasetId } });
    if (!ds) throw new NotFoundException(`Dataset '${datasetId}' not found`);
    if (ds.ownerId !== userId) {
      throw new ForbiddenException('not_dataset_owner');
    }
    await repo.delete({ id: datasetId });
  }
}
