import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReadingsModule } from '../readings/readings.module';
import { DeviceJwtService } from './device-jwt.service';
import { IngestService } from './ingest.service';

@Module({
  imports: [
    // Device JWTs use a separate secret + expiry from the user JWTs, so we
    // register a private JwtModule instance for this module rather than
    // importing AuthModule's. Each call uses the per-call `secret` override
    // anyway — this registration just gives us a JwtService to inject.
    JwtModule.register({}),
    ReadingsModule,
  ],
  providers: [DeviceJwtService, IngestService],
  exports: [DeviceJwtService, IngestService],
})
export class IngestModule {}
