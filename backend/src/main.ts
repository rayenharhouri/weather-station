import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { assertProductionSecrets, loadConfig, type RunMode } from './config/configuration';

async function bootstrap(): Promise<void> {
  const rawConfig = loadConfig();
  assertProductionSecrets(rawConfig);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const mode = config.get<RunMode>('mode') ?? 'demo';
  logger.log(`Run mode: ${mode}`);
  if (mode === 'demo') {
    logger.warn('Demo mode is active — endpoints may serve seeded data alongside real reads.');
  }
  if (mode === 'test') {
    logger.warn('Test mode is active — deterministic seeds, no real I/O expected.');
  }

  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerEnabled = mode !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const doc = new DocumentBuilder()
      .setTitle('WeatherHub Backend')
      .setDescription(
        'Multi-tenant weather-station backend. Two auth schemes — JWT for the operations dashboard and API tokens (`wh_rsa_…`) for the `/v1/*` researcher surface.',
      )
      .setVersion('0.1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Operations JWT session token from POST /auth/login.' },
        'jwt',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'wh_rsa_', description: 'Researcher API token minted via POST /v1/tokens. Sent as `Authorization: Bearer wh_rsa_…` (or `?token=` for SSE).' },
        'api-token',
      )
      .addTag('auth', 'JWT login + session introspection.')
      .addTag('stations', 'Per-tenant station registry (JWT).')
      .addTag('readings', 'Sensor readings + live SSE stream (JWT).')
      .addTag('device', 'Computed device-status snapshots (JWT).')
      .addTag('alerts', 'Threshold breach lifecycle + SSE (JWT).')
      .addTag('forecasts', 'Cached statistical projections (JWT).')
      .addTag('integrity', 'Merkle batches + verification (JWT).')
      .addTag('settings', 'Operations user preferences (JWT).')
      .addTag('tokens', 'API-token CRUD for the researcher portal (JWT).')
      .addTag('v1', 'Researcher API surface (API-token auth).')
      .addTag('health', 'Liveness + readiness probes.')
      .build();
    const document = SwaggerModule.createDocument(app, doc);
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger UI at /docs · raw spec at /docs-json');
  }

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  logger.log(`WeatherHub backend listening on http://localhost:${port}`);
  logger.log(`CORS allowed origin: ${config.get<string>('corsOrigin')}`);
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap WeatherHub backend:', err);
  process.exit(1);
});
