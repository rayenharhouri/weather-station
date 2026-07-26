export type AppConfig = ReturnType<typeof loadConfig>;

export type RunMode = 'production' | 'demo' | 'test';

const VALID_MODES: ReadonlySet<RunMode> = new Set(['production', 'demo', 'test']);

function readMode(): RunMode {
  const raw = (process.env.WH_MODE ?? 'demo').toLowerCase();
  if (VALID_MODES.has(raw as RunMode)) {
    return raw as RunMode;
  }
  throw new Error(
    `Invalid WH_MODE='${raw}'. Allowed values: production | demo | test.`,
  );
}

export const loadConfig = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mode: readMode(),
  port: parseInt(process.env.PORT ?? '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  masterDb: {
    host: process.env.MASTER_DB_HOST ?? 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT ?? '5432', 10),
    user: process.env.MASTER_DB_USER ?? 'weatherhub',
    password: process.env.MASTER_DB_PASSWORD ?? 'weatherhub',
    database: process.env.MASTER_DB_NAME ?? 'weatherhub_master',
  },

  tenantDb: {
    host: process.env.TENANT_DB_HOST ?? 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT ?? '5432', 10),
    user: process.env.TENANT_DB_USER ?? 'weatherhub',
    password: process.env.TENANT_DB_PASSWORD ?? 'weatherhub',
    prefix: process.env.TENANT_DB_PREFIX ?? 'tenant_',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  deviceJwt: {
    secret: process.env.DEVICE_JWT_SECRET ?? 'dev-device-secret-change-me',
    expiresIn: process.env.DEVICE_JWT_EXPIRES_IN ?? '365d',
  },

  mqtt: {
    url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME ?? 'ingest-worker',
    password: process.env.MQTT_PASSWORD ?? 'ingest-worker',
    topicPattern: process.env.MQTT_TOPIC_PATTERN ?? 'tenants/+/stations/+/readings',
  },

  hedera: {
    enabled: process.env.HEDERA_ENABLED === 'true',
    network: process.env.HEDERA_NETWORK ?? 'testnet',
    operatorAccountId: process.env.HEDERA_OPERATOR_ACCOUNT_ID,
    operatorPrivateKey: process.env.HEDERA_OPERATOR_PRIVATE_KEY,
    topicId: process.env.HEDERA_TOPIC_ID,
  },

  schedulers: {
    anchorTickMs: parseInt(process.env.ANCHOR_SCHEDULER_TICK_MS ?? '300000', 10),
    forecastTickMs: parseInt(process.env.FORECAST_SCHEDULER_TICK_MS ?? '600000', 10),
    tokenSweeperTickMs: parseInt(process.env.TOKEN_SWEEPER_TICK_MS ?? '3600000', 10),
  },

  exports: {
    root: process.env.EXPORTS_ROOT ?? '/tmp/wh-exports',
    ttlHours: parseInt(process.env.EXPORTS_TTL_HOURS ?? '168', 10),
    workerTickMs: parseInt(process.env.EXPORTS_WORKER_TICK_MS ?? '5000', 10),
  },
});

export const configuration = () => loadConfig();

export function assertProductionSecrets(config: AppConfig): void {
  if (config.mode !== 'production') return;
  const violations: string[] = [];
  if (
    !process.env.JWT_SECRET ||
    config.jwt.secret === 'dev-secret-change-me' ||
    config.jwt.secret.includes('replace-me')
  ) {
    violations.push('JWT_SECRET is at its dev default');
  }
  if (
    !process.env.DEVICE_JWT_SECRET ||
    config.deviceJwt.secret === 'dev-device-secret-change-me' ||
    config.deviceJwt.secret.includes('replace-me')
  ) {
    violations.push('DEVICE_JWT_SECRET is at its dev default');
  }
  if (config.masterDb.password === 'weatherhub' || config.tenantDb.password === 'weatherhub') {
    violations.push('database password is at its dev default');
  }
  if (violations.length > 0) {
    throw new Error(
      `Refusing to boot in WH_MODE=production with insecure defaults:\n - ${violations.join('\n - ')}`,
    );
  }
}
