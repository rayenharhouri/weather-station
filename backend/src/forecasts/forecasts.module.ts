import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { ForecastsController } from './forecasts.controller';
import { ForecastsService } from './forecasts.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [ForecastsController],
  providers: [ForecastsService],
  exports: [ForecastsService],
})
export class ForecastsModule {}
