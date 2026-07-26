import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReadingsModule } from '../readings/readings.module';
import { DeviceJwtService } from './device-jwt.service';
import { IngestService } from './ingest.service';

@Module({
  imports: [
    JwtModule.register({}),
    ReadingsModule,
  ],
  providers: [DeviceJwtService, IngestService],
  exports: [DeviceJwtService, IngestService],
})
export class IngestModule {}
