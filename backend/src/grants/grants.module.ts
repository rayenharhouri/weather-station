import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantModule } from '../tenancy/tenant.module';
import { AdminGrantsController } from './admin-grants.controller';
import { GrantsController } from './grants.controller';
import { GrantsService } from './grants.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [GrantsController, AdminGrantsController],
  providers: [GrantsService, RolesGuard],
  exports: [GrantsService],
})
export class GrantsModule {}
