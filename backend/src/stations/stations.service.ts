import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantService } from '../tenancy/tenant.service';
import { Station } from './entities/station.entity';

@Injectable()
export class StationsService {
  constructor(private readonly tenantService: TenantService) {}

  private async repo(tenantSlug: string): Promise<Repository<Station>> {
    const ds = await this.tenantService.getDataSource(tenantSlug);
    return ds.getRepository(Station);
  }

  async findAll(tenantSlug: string): Promise<Station[]> {
    const repo = await this.repo(tenantSlug);
    return repo.find({ order: { createdAt: 'ASC' } });
  }

  async findById(tenantSlug: string, id: string): Promise<Station> {
    const repo = await this.repo(tenantSlug);
    const station = await repo.findOne({ where: { id } });
    if (!station) {
      throw new NotFoundException(`Station '${id}' not found`);
    }
    return station;
  }

  /**
   * Refresh `lastSyncedAt` and roll the status based on most recent reading.
   * Called from the readings service whenever a reading is persisted.
   */
  async touchLastSync(tenantSlug: string, stationId: string, when: Date): Promise<void> {
    const repo = await this.repo(tenantSlug);
    await repo.update({ id: stationId }, { lastSyncedAt: when, status: 'online' });
  }
}
