import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { Tenant } from './tenancy/entities/tenant.entity';
import { TenantModule } from './tenancy/tenant.module';
import { TenantContextMiddleware } from './tenancy/tenant-context.middleware';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { StationsModule } from './stations/stations.module';
import { ReadingsModule } from './readings/readings.module';
import { TokensModule } from './tokens/tokens.module';
import { ResearchApiModule } from './research-api/research-api.module';
import { DeviceModule } from './device/device.module';
import { AlertsModule } from './alerts/alerts.module';
import { ForecastsModule } from './forecasts/forecasts.module';
import { IntegrityModule } from './integrity/integrity.module';
import { AccountModule } from './account/account.module';
import { UsageModule } from './usage/usage.module';
import { GrantsModule } from './grants/grants.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ExportsModule } from './exports/exports.module';
import { IngestModule } from './ingest/ingest.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { SchedulersModule } from './schedulers/schedulers.module';
import { ObservabilityModule } from './observability/observability.module';
import { RequestLoggerMiddleware } from './observability/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('masterDb.host'),
        port: config.get<number>('masterDb.port'),
        username: config.get<string>('masterDb.user'),
        password: config.get<string>('masterDb.password'),
        database: config.get<string>('masterDb.database'),
        entities: [Tenant],
        synchronize: false,
        autoLoadEntities: false,
        logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
      }),
    }),
    TenantModule,
    HealthModule,
    AuthModule,
    StationsModule,
    AlertsModule,
    ForecastsModule,
    IntegrityModule,
    AccountModule,
    UsageModule,
    GrantsModule,
    DatasetsModule,
    ExportsModule,
    ReadingsModule,
    IngestModule,
    RateLimitModule,
    SchedulersModule,
    ObservabilityModule,
    TokensModule,
    ResearchApiModule,
    DeviceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware, TenantContextMiddleware).forRoutes('*');
  }
}
