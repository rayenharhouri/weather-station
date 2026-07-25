import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RateLimitInterceptor } from './rate-limit.interceptor';

/**
 * Registers `RateLimitInterceptor` as a global interceptor.
 *
 * The interceptor checks every request, but only takes action when
 * `req.apiToken` is populated — so it's effectively scoped to `/v1/*`
 * routes (the only ones running behind `TokenAuthGuard`). JWT-auth
 * operations endpoints are unaffected.
 */
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor }],
})
export class RateLimitModule {}
