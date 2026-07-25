import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { HederaAnchorService } from './hedera-anchor.service';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [IntegrityController],
  providers: [IntegrityService, HederaAnchorService],
  exports: [IntegrityService],
})
export class IntegrityModule {}
