import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsStreamService } from './alerts-stream.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsStreamService],
  exports: [AlertsService, AlertsStreamService],
})
export class AlertsModule {}
