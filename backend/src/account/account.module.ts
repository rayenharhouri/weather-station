import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [AccountController, SettingsController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
