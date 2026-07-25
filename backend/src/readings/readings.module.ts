import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';
import { StationsModule } from '../stations/stations.module';
import { TenantModule } from '../tenancy/tenant.module';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import { ReadingsStreamService } from './readings-stream.service';

@Module({
  imports: [TenantModule, AuthModule, StationsModule, AlertsModule],
  controllers: [ReadingsController],
  providers: [ReadingsService, ReadingsStreamService],
  exports: [ReadingsService, ReadingsStreamService],
})
export class ReadingsModule {}
