import { Module } from '@nestjs/common';
import { RequestLoggerMiddleware } from './request-logger.middleware';

/**
 * Exports the middleware so `AppModule` can apply it globally. Other
 * observability bits (Prometheus exporter, OTLP traces) drop in here
 * later if/when they're wired up.
 */
@Module({
  providers: [RequestLoggerMiddleware],
  exports: [RequestLoggerMiddleware],
})
export class ObservabilityModule {}
