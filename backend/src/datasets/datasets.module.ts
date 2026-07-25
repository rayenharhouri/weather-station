import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
