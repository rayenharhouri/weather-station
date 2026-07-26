import { Module } from '@nestjs/common';
import { RequestLoggerMiddleware } from './request-logger.middleware';

@Module({
  providers: [RequestLoggerMiddleware],
  exports: [RequestLoggerMiddleware],
})
export class ObservabilityModule {}
