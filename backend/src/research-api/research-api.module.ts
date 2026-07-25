import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { ForecastsModule } from '../forecasts/forecasts.module';
import { IntegrityModule } from '../integrity/integrity.module';
import { ReadingsModule } from '../readings/readings.module';
import { StationsModule } from '../stations/stations.module';
import { TenantModule } from '../tenancy/tenant.module';
import { ResearchApiController } from './research-api.controller';
import { ResearchAlertsController } from './research-alerts.controller';
import { ResearchForecastsController } from './research-forecasts.controller';
import { ResearchIntegrityController } from './research-integrity.controller';
import { ResearchReadingsController } from './research-readings.controller';
import { ResearchStationsController } from './research-stations.controller';

@Module({
  imports: [
    TenantModule,
    ReadingsModule,
    StationsModule,
    AlertsModule,
    ForecastsModule,
    IntegrityModule,
  ],
  controllers: [
    ResearchApiController,
    ResearchReadingsController,
    ResearchStationsController,
    ResearchForecastsController,
    ResearchAlertsController,
    ResearchIntegrityController,
  ],
})
export class ResearchApiModule {}
