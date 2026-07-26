import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../tenancy/tenant.module';
import { RequestLogInterceptor } from './request-log.interceptor';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [TenantModule, AuthModule],
  controllers: [UsageController],
  providers: [
    UsageService,
    { provide: APP_INTERCEPTOR, useClass: RequestLogInterceptor },
  ],
  exports: [UsageService],
})
export class UsageModule {}
