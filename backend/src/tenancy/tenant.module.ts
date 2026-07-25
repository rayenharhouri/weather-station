import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';
import { TenantContextMiddleware } from './tenant-context.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantService, TenantContextMiddleware],
  exports: [TenantService, TenantContextMiddleware],
})
export class TenantModule {}
