import { Module } from '@nestjs/common';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { IntegrityModule } from '../integrity/integrity.module';
import { StationsModule } from '../stations/stations.module';
import { TenantModule } from '../tenancy/tenant.module';
import { AnchorSchedulerService } from './anchor-scheduler.service';
import { ForecastSchedulerService } from './forecast-scheduler.service';
import { TokenSweeperService } from './token-sweeper.service';

@Module({
  imports: [TenantModule, StationsModule, ForecastsModule, IntegrityModule],
  providers: [AnchorSchedulerService, ForecastSchedulerService, TokenSweeperService],
})
export class SchedulersModule {}
