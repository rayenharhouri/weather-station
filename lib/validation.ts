import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['admin', 'researcher', 'viewer']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  expiresIn: z.number(),
});

export const SensorTypeSchema = z.enum([
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
  'light',
  'airQuality',
  'battery',
  'signal',
]);

export const StationSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  status: z.enum(['online', 'offline', 'maintenance']),
  lastSyncedAt: z.string().nullable(),
  enabledSensors: z.array(SensorTypeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WeatherReadingSchema = z.object({
  id: z.string(),
  stationId: z.string(),
  deviceId: z.string().nullable().optional(),
  recordedAt: z.string(),
  receivedAt: z.string(),
  temperatureC: z.number().nullable().optional(),
  humidityPct: z.number().nullable().optional(),
  pressureHpa: z.number().nullable().optional(),
  rainfallMm: z.number().nullable().optional(),
  lightLux: z.number().nullable().optional(),
  airQualityValue: z.number().nullable().optional(),
  batteryVoltage: z.number().nullable().optional(),
  signalRssi: z.number().nullable().optional(),
});

export const SummaryMetricSchema = z.enum([
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
  'light',
  'airQuality',
]);

export const WeatherSummarySchema = z.object({
  stationId: z.string(),
  metric: SummaryMetricSchema,
  period: z.string(),
  min: z.number(),
  max: z.number(),
  avg: z.number(),
  trend: z.enum(['up', 'down', 'stable']),
  dataCount: z.number(),
});

export const DeviceStatusSchema = z.object({
  stationId: z.string(),
  lastReceivedAt: z.string(),
  signalStrength: z.enum(['excellent', 'good', 'fair', 'poor', 'none']),
  batteryLevel: z.number().optional(),
  memoryUsage: z.number().optional(),
  uptime: z.number().optional(),
  recordsProcessed: z.number().optional(),
});

export const ForecastMetricSchema = z.enum([
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
]);

export const ForecastItemSchema = z.object({
  timestamp: z.string(),
  metric: ForecastMetricSchema,
  predictedValue: z.number(),
  confidence: z.number(),
});

export const ForecastSchema = z.object({
  id: z.string(),
  stationId: z.string(),
  generatedAt: z.string(),
  validFrom: z.string(),
  validTo: z.string(),
  items: z.array(ForecastItemSchema),
  confidence: z.number(),
  explanation: z.string(),
});

export const AlertSchema = z.object({
  id: z.string(),
  stationId: z.string(),
  metric: z.string(),
  threshold: z.number(),
  actualValue: z.number(),
  severity: z.enum(['info', 'warning', 'critical']),
  status: z.enum(['open', 'acknowledged', 'resolved']),
  message: z.string(),
  triggeredAt: z.string(),
  acknowledgedAt: z.string().nullable().optional(),
  acknowledgedBy: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  resolvedBy: z.string().nullable().optional(),
});

export const IntegrityBatchSchema = z.object({
  id: z.string(),
  stationId: z.string(),
  timeWindowStart: z.string(),
  timeWindowEnd: z.string(),
  recordCount: z.number(),
  merkleRoot: z.string().optional(),
  dataHash: z.string().optional(),
  hederaTopicId: z.string(),
  hederaSequenceNumber: z.number(),
  hederaTransactionId: z.string(),
  consensusTimestamp: z.string(),
  mirrorNodeVerified: z.boolean(),
  simulated: z.boolean(),
  verifiedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const ApiTokenScopeSchema = z.object({
  stations: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  readOnly: z.boolean().default(true),
  crossTenant: z.boolean().optional(),
});

export const ApiTokenStatusSchema = z.enum(['active', 'revoked', 'expired']);

export const ApiTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  suffix: z.string(),
  scope: ApiTokenScopeSchema,
  status: ApiTokenStatusSchema,
  lastUsedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable().optional(),
  requestsTotal: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateTokenResponseSchema = z.object({
  token: ApiTokenSchema,
  plaintext: z.string(),
});

export const RecordVerificationResultSchema = z.object({
  recordId: z.string(),
  stationId: z.string(),
  recordHash: z.string(),
  computedHash: z.string(),
  hashMatch: z.boolean(),
  batchId: z.string().optional(),
  batchMembership: z.boolean(),
  hederaTopicId: z.string().optional(),
  hederaSequenceNumber: z.number().optional(),
  hederaTransactionId: z.string().optional(),
  consensusTimestamp: z.string().optional(),
  mirrorNodeVerified: z.boolean(),
  simulated: z.boolean().optional(),
  verificationMessage: z.string(),
});

export const ApiResponseSchema = <T extends z.ZodType<any>>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string(),
  });

export const PaginatedResponseSchema = <T extends z.ZodType<any>>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  });

export const V1EnvelopeSchema = <T extends z.ZodType<any>>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    next_cursor: z.string().nullable().optional(),
  });

export const V1DatasetSchema = z.object({
  id: z.string(),
  owner_id: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  visibility: z.enum(['public', 'private', 'shared']),
  metric: z.string(),
  station_name: z.string(),
  station_id: z.string().nullable(),
  window_start: z.string(),
  window_end: z.string(),
  record_count: z.number(),
  size_bytes: z.number(),
  formats: z.array(z.enum(['csv', 'json', 'parquet'])),
  citation: z.string().nullable(),
  playground_href: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const V1UsageBucketSchema = z.object({
  bucketStart: z.string(),
  byToken: z.record(z.string(), z.number()),
});

export const V1UsageTokenRowSchema = z.object({
  tokenId: z.string(),
  name: z.string(),
  callsToday: z.number(),
  callsRange: z.number(),
  latencyP50Ms: z.number(),
  errorRatePct: z.number(),
  quotaUsedDay: z.number(),
});

export const V1UsageEndpointSchema = z.object({
  endpoint: z.string(),
  calls: z.number(),
  latencyP50Ms: z.number(),
  errorRatePct: z.number(),
});

export const V1UsageSchema = z.object({
  range: z.enum(['24h', '7d', '30d']),
  totalCalls: z.number(),
  callsDeltaPct: z.number(),
  latencyP50Ms: z.number(),
  latencyP95Ms: z.number(),
  latencyP99Ms: z.number(),
  errorCount: z.number(),
  errorRatePct: z.number(),
  quotaUsedPct: z.number(),
  dailyRemaining: z.number(),
  buckets: z.array(V1UsageBucketSchema),
  tokens: z.array(V1UsageTokenRowSchema),
  topEndpoints: z.array(V1UsageEndpointSchema),
});

export const V1ExportSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.string(),
  station_id: z.string().nullable(),
  station_name: z.string(),
  window_start: z.string(),
  window_end: z.string(),
  format: z.enum(['csv', 'json', 'parquet']),
  status: z.enum(['queued', 'running', 'ready', 'failed', 'expired']),
  requested_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  record_count: z.number().nullable(),
  size_bytes: z.number().nullable(),
  progress_pct: z.number(),
  error_message: z.string().nullable(),
});

export const V1AccountSchema = z.object({
  notifications: z.object({
    weeklyDigest: z.boolean(),
    rateLimitWarnings: z.boolean(),
    breakingChanges: z.boolean(),
    anchorCompletion: z.boolean(),
    grantUpdates: z.boolean(),
  }),
  citation_format: z.enum(['apa', 'mla', 'chicago', 'bibtex']),
  auto_cite: z.boolean(),
  active_token_id: z.string().nullable(),
  orcid: z.string().nullable(),
  affiliation: z.string().nullable(),
});

export const V1GrantSchema = z.object({
  id: z.string(),
  target_tenant: z.string(),
  scope: z.string(),
  status: z.enum(['pending', 'active', 'revoked']),
  granted_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
  created_at: z.string(),
});
