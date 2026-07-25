import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReadingsModule } from '../readings/readings.module';
import { TenantModule } from '../tenancy/tenant.module';
import { DeviceController } from './device.controller';

@Module({
  imports: [TenantModule, AuthModule, ReadingsModule],
  controllers: [DeviceController],
})
export class DeviceModule {}
