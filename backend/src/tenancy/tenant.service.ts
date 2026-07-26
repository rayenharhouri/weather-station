import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import {
  TenantConnectionConfig,
  createTenantDataSource,
} from '../database/tenant-data-source.factory';

@Injectable()
export class TenantService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);
  private readonly dataSources = new Map<string, DataSource>();

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly config: ConfigService,
  ) {}

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { slug, active: true } });
    if (!tenant) {
      throw new NotFoundException(`Tenant '${slug}' not found or inactive`);
    }
    return tenant;
  }

  async findByEmailDomain(domain: string): Promise<Tenant | null> {
    return this.tenantRepo.findOne({
      where: { emailDomain: domain.toLowerCase(), active: true },
    });
  }

  async listActive(): Promise<Tenant[]> {
    return this.tenantRepo.find({ where: { active: true }, order: { slug: 'ASC' } });
  }

  async getDataSource(slug: string): Promise<DataSource> {
    const existing = this.dataSources.get(slug);
    if (existing?.isInitialized) {
      return existing;
    }

    const tenant = await this.findBySlug(slug);
    const conn: TenantConnectionConfig = {
      host: this.config.get<string>('tenantDb.host')!,
      port: this.config.get<number>('tenantDb.port')!,
      username: this.config.get<string>('tenantDb.user')!,
      password: this.config.get<string>('tenantDb.password')!,
      database: tenant.dbName,
    };

    const ds = createTenantDataSource(conn);
    await ds.initialize();
    this.dataSources.set(slug, ds);
    this.logger.log(`Initialized DataSource for tenant '${slug}' (${tenant.dbName})`);
    return ds;
  }

  async onModuleDestroy(): Promise<void> {
    for (const [slug, ds] of this.dataSources.entries()) {
      if (ds.isInitialized) {
        await ds.destroy();
        this.logger.log(`Closed DataSource for tenant '${slug}'`);
      }
    }
    this.dataSources.clear();
  }
}
