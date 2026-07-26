import { apiClient, ApiError, v1ApiClient } from '@/lib/api-client';
import { config } from '@/lib/config';
import {
  UserSchema,
  AuthResponseSchema,
  StationSchema,
  WeatherReadingSchema,
  WeatherSummarySchema,
  AlertSchema,
  ForecastSchema,
  IntegrityBatchSchema,
  RecordVerificationResultSchema,
  PaginatedResponseSchema,
  ApiResponseSchema,
  DeviceStatusSchema,
  ApiTokenSchema,
  CreateTokenResponseSchema,
  V1EnvelopeSchema,
  V1DatasetSchema,
  V1UsageSchema,
  V1ExportSchema,
  V1AccountSchema,
  V1GrantSchema,
} from '@/lib/validation';
import type { z } from 'zod';
import {
  mockUser,
  mockStations,
  generateMockWeatherReadings,
  generateMockWeatherSummary,
  mockDeviceStatus,
  generateMockForecast,
  generateMockAlerts,
  generateMockIntegrityBatches,
} from '@/lib/mock-data';

const withMockFallback = async <T,>(
  apiFn: () => Promise<T>,
  mockData: T | (() => T),
  endpointName: string,
): Promise<T> => {
  const resolveMock = (): T =>
    typeof mockData === 'function' ? (mockData as () => T)() : mockData;

  if (config.mode === 'test') {
    return resolveMock();
  }

  if (config.mode === 'production') {
    return apiFn();
  }

  try {
    return await apiFn();
  } catch (error) {
    console.warn(
      `[demo] ${endpointName} failed, falling back to mock data:`,
      error instanceof Error ? error.message : error,
    );
    if (config.mockDataDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.mockDataDelay));
    }
    return resolveMock();
  }
};

export const authService = {
  async login(email: string, password: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<any>('/auth/login', { email, password });
        return AuthResponseSchema.parse(response);
      },
      { user: mockUser, token: 'mock-token-12345', expiresIn: 86400 },
      'login'
    );
  },

  async getMe() {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>('/auth/me');
        return UserSchema.parse(response);
      },
      mockUser,
      'getMe'
    );
  },

  async logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('weather_station_auth_token');
    }
  },
};

export type OpsNotificationPrefs = {
  alertsEmail: boolean;
  dailyReport: boolean;
  weeklyReport: boolean;
};

export type AlertThresholds = {
  tempCriticalC: number;
  humidityWarnPct: number;
  pressureLowHpa: number;
  rainfallHourlyMm: number;
};

export type SettingsSnapshot = {
  notifications: OpsNotificationPrefs;
  thresholds: AlertThresholds;
};

export type SettingsPatchInput = Partial<{
  notifications: Partial<OpsNotificationPrefs>;
  thresholds: Partial<AlertThresholds>;
}>;

export const settingsService = {
  async get(): Promise<SettingsSnapshot> {
    return apiClient.get<SettingsSnapshot>('/settings/preferences');
  },

  async patch(patch: SettingsPatchInput): Promise<SettingsSnapshot> {
    return apiClient.patch<SettingsSnapshot>('/settings/preferences', patch);
  },
};

export const stationService = {
  async getAll() {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>('/stations');
        const schema = PaginatedResponseSchema(StationSchema);
        return schema.parse(response);
      },
      {
        items: mockStations,
        total: mockStations.length,
        page: 1,
        pageSize: 10,
        hasMore: false,
      },
      'getStations'
    );
  },

  async getById(stationId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>(`/stations/${stationId}`);
        return StationSchema.parse(response);
      },
      mockStations[0],
      `getStation/${stationId}`
    );
  },
};

export const readingService = {
  async getLatest(stationId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>(`/readings/latest?stationId=${stationId}`);
        const schema = PaginatedResponseSchema(WeatherReadingSchema);
        return schema.parse(response);
      },
      {
        items: generateMockWeatherReadings(1),
        total: 1,
        page: 1,
        pageSize: 1,
        hasMore: false,
      },
      `getLatestReadings/${stationId}`
    );
  },

  async getHistory(params: { stationId: string; from: string; to: string; interval?: string }) {
    return withMockFallback(
      async () => {
        const queryParams = new URLSearchParams({
          stationId: params.stationId,
          from: params.from,
          to: params.to,
          ...(params.interval && { interval: params.interval }),
        });
        const response = await apiClient.get<any>(`/readings/history?${queryParams}`);
        const schema = PaginatedResponseSchema(WeatherReadingSchema);
        return schema.parse(response);
      },
      {
        items: generateMockWeatherReadings(100),
        total: 100,
        page: 1,
        pageSize: 100,
        hasMore: false,
      },
      `getReadingsHistory/${params.stationId}`
    );
  },

  async getSummary(stationId: string, range: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>(`/readings/summary?stationId=${stationId}&range=${range}`);
        const schema = PaginatedResponseSchema(WeatherSummarySchema);
        return schema.parse(response);
      },
      {
        items: [
          generateMockWeatherSummary('temperature'),
          generateMockWeatherSummary('humidity'),
          generateMockWeatherSummary('pressure'),
          generateMockWeatherSummary('rainfall'),
          generateMockWeatherSummary('light'),
          generateMockWeatherSummary('airQuality'),
        ],
        total: 6,
        page: 1,
        pageSize: 6,
        hasMore: false,
      },
      `getReadingsSummary/${stationId}`
    );
  },

  async getDeviceStatus(stationId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>(`/device/status?stationId=${stationId}`);
        return DeviceStatusSchema.parse(response);
      },
      mockDeviceStatus,
      `getDeviceStatus/${stationId}`
    );
  },
};

export const forecastService = {
  async getForecasts(stationId: string, horizon?: string) {
    return withMockFallback(
      async () => {
        const params = new URLSearchParams({ stationId });
        if (horizon) params.append('horizon', horizon);
        const response = await apiClient.get<any>(`/forecasts?${params}`);
        return ForecastSchema.parse(response);
      },
      generateMockForecast(),
      `getForecasts/${stationId}`
    );
  },
};

export const alertService = {
  async getAlerts(params?: { stationId?: string; status?: string; severity?: string; from?: string; to?: string }) {
    return withMockFallback(
      async () => {
        const queryParams = new URLSearchParams();
        if (params?.stationId) queryParams.append('stationId', params.stationId);
        if (params?.status) queryParams.append('status', params.status);
        if (params?.severity) queryParams.append('severity', params.severity);
        if (params?.from) queryParams.append('from', params.from);
        if (params?.to) queryParams.append('to', params.to);

        const response = await apiClient.get<any>(`/alerts?${queryParams}`);
        const schema = PaginatedResponseSchema(AlertSchema);
        return schema.parse(response);
      },
      {
        items: generateMockAlerts(),
        total: generateMockAlerts().length,
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
      'getAlerts'
    );
  },

  async acknowledgeAlert(alertId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.patch<any>(`/alerts/${alertId}/ack`, {
          acknowledgedAt: new Date().toISOString(),
        });
        return AlertSchema.parse(response);
      },
      { ...generateMockAlerts()[0], status: 'acknowledged' },
      `acknowledgeAlert/${alertId}`
    );
  },

  async resolveAlert(alertId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.patch<any>(`/alerts/${alertId}/resolve`, {
          resolvedAt: new Date().toISOString(),
        });
        return AlertSchema.parse(response);
      },
      { ...generateMockAlerts()[0], status: 'resolved' },
      `resolveAlert/${alertId}`
    );
  },
};

export const integrityService = {
  async getBatches(params?: { stationId?: string; from?: string; to?: string }) {
    return withMockFallback(
      async () => {
        const queryParams = new URLSearchParams();
        if (params?.stationId) queryParams.append('stationId', params.stationId);
        if (params?.from) queryParams.append('from', params.from);
        if (params?.to) queryParams.append('to', params.to);

        const response = await apiClient.get<any>(`/integrity/batches?${queryParams}`);
        const schema = PaginatedResponseSchema(IntegrityBatchSchema);
        return schema.parse(response);
      },
      {
        items: generateMockIntegrityBatches(),
        total: generateMockIntegrityBatches().length,
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
      'getIntegrityBatches'
    );
  },

  async getBatchDetail(batchId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>(`/integrity/batches/${batchId}`);
        return IntegrityBatchSchema.parse(response);
      },
      generateMockIntegrityBatches()[0],
      `getBatchDetail/${batchId}`
    );
  },

  async verifyRecord(recordId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<any>('/integrity/verify-record', { recordId });
        return RecordVerificationResultSchema.parse(response);
      },
      {
        recordId,
        stationId: 'station-001',
        recordHash: 'abc123def456',
        computedHash: 'abc123def456',
        hashMatch: true,
        batchId: 'batch-001',
        batchMembership: true,
        hederaTopicId: '0.0.1234567',
        hederaSequenceNumber: 42,
        hederaTransactionId: '0.0.7654321@1713607200.123456789',
        consensusTimestamp: new Date().toISOString(),
        mirrorNodeVerified: true,
        verificationMessage: 'Record verified successfully on Hedera',
      },
      `verifyRecord/${recordId}`
    );
  },

  async verifyBatch(batchId: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<any>('/integrity/verify-batch', { batchId });
        return IntegrityBatchSchema.parse(response);
      },
      generateMockIntegrityBatches()[0],
      `verifyBatch/${batchId}`
    );
  },
};

export type ApiTokenResource = z.infer<typeof ApiTokenSchema>;
export type CreateTokenInput = {
  name: string;
  scope?: {
    stations?: string[];
    metrics?: string[];
    readOnly?: boolean;
    crossTenant?: boolean;
  };
  expiry?: '30d' | '90d' | '365d' | 'never';
};

const generateMockToken = (input: CreateTokenInput): ApiTokenResource => {
  const now = new Date();
  const expiresAt = input.expiry === 'never'
    ? null
    : new Date(now.getTime() + ({ '30d': 30, '90d': 90, '365d': 365 }[input.expiry ?? '90d']) * 86_400_000).toISOString();
  return {
    id: `t_${Math.random().toString(36).slice(2, 10)}`,
    userId: 'mock-user',
    name: input.name,
    suffix: Math.random().toString(36).slice(2, 6),
    scope: {
      stations: input.scope?.stations ?? [],
      metrics: input.scope?.metrics ?? [],
      readOnly: input.scope?.readOnly ?? true,
      ...(input.scope?.crossTenant ? { crossTenant: true } : {}),
    },
    status: 'active',
    lastUsedAt: null,
    expiresAt,
    revokedAt: null,
    requestsTotal: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
};

export const tokenService = {
  async list() {
    return withMockFallback(
      async () => {
        const response = await apiClient.get<any>('/v1/tokens');
        const schema = PaginatedResponseSchema(ApiTokenSchema);
        return schema.parse(response);
      },
      {
        items: [] as ApiTokenResource[],
        total: 0,
        page: 1,
        pageSize: 0,
        hasMore: false,
      },
      'listTokens',
    );
  },

  async create(input: CreateTokenInput) {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<any>('/v1/tokens', input);
        return CreateTokenResponseSchema.parse(response);
      },
      {
        token: generateMockToken(input),
        plaintext: `wh_rsa_${Array.from({ length: 32 }, () =>
          'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[
            Math.floor(Math.random() * 56)
          ],
        ).join('')}`,
      },
      'createToken',
    );
  },

  async revoke(id: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.delete<any>(`/v1/tokens/${id}`);
        return ApiTokenSchema.parse(response);
      },
      {
        ...generateMockToken({ name: 'mock' }),
        id,
        status: 'revoked' as const,
        revokedAt: new Date().toISOString(),
      },
      `revokeToken/${id}`,
    );
  },

  async rotate(id: string) {
    return withMockFallback(
      async () => {
        const response = await apiClient.post<any>(`/v1/tokens/${id}/rotate`, {});
        return CreateTokenResponseSchema.parse(response);
      },
      {
        token: generateMockToken({ name: 'rotated' }),
        plaintext: `wh_rsa_${Array.from({ length: 32 }, () =>
          'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[
            Math.floor(Math.random() * 56)
          ],
        ).join('')}`,
      },
      `rotateToken/${id}`,
    );
  },
};

export type DatasetResource = {
  id: string;
  ownerId: string | null;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'shared';
  metric: string;
  stationName: string;
  stationId: string | null;
  windowStart: string;
  windowEnd: string;
  recordCount: number;
  sizeBytes: number;
  formats: ('csv' | 'json' | 'parquet')[];
  citation: string | null;
  playgroundHref: string | null;
  createdAt: string;
  updatedAt: string;
};

const toDataset = (raw: z.infer<typeof V1DatasetSchema>): DatasetResource => ({
  id: raw.id,
  ownerId: raw.owner_id,
  title: raw.title,
  description: raw.description,
  visibility: raw.visibility,
  metric: raw.metric,
  stationName: raw.station_name,
  stationId: raw.station_id,
  windowStart: raw.window_start,
  windowEnd: raw.window_end,
  recordCount: raw.record_count,
  sizeBytes: raw.size_bytes,
  formats: raw.formats,
  citation: raw.citation,
  playgroundHref: raw.playground_href,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export type CreateDatasetInput = {
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'shared';
  metric: string;
  stationName: string;
  stationId?: string;
  windowStart: string;
  windowEnd: string;
  recordCount: number;
  sizeBytes: number;
  formats: ('csv' | 'json' | 'parquet')[];
  citation?: string;
  playgroundHref?: string;
};

export const datasetService = {
  async list(filter?: { visibility?: 'public' | 'private' | 'shared' | 'all'; q?: string }) {
    const params = new URLSearchParams();
    if (filter?.visibility) params.set('visibility', filter.visibility);
    if (filter?.q) params.set('q', filter.q);
    const qs = params.toString();
    const response = await v1ApiClient.get<any>(`/v1/datasets${qs ? `?${qs}` : ''}`);
    const parsed = V1EnvelopeSchema(V1DatasetSchema.array()).parse(response);
    return parsed.data.map(toDataset);
  },

  async create(input: CreateDatasetInput): Promise<DatasetResource> {
    const body = {
      title: input.title,
      description: input.description,
      visibility: input.visibility,
      metric: input.metric,
      station_name: input.stationName,
      station_id: input.stationId,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      record_count: input.recordCount,
      size_bytes: input.sizeBytes,
      formats: input.formats,
      citation: input.citation,
      playground_href: input.playgroundHref,
    };
    const response = await v1ApiClient.post<any>('/v1/datasets', body);
    const parsed = V1EnvelopeSchema(V1DatasetSchema).parse(response);
    return toDataset(parsed.data);
  },

  async delete(id: string): Promise<void> {
    await v1ApiClient.delete<unknown>(`/v1/datasets/${id}`);
  },

  downloadHref(id: string): string {
    return `${config.apiUrl}/v1/datasets/${id}/download`;
  },
};

export type UsageSnapshot = z.infer<typeof V1UsageSchema>;
export type UsageRange = '24h' | '7d' | '30d';

export const usageService = {
  async summary(range: UsageRange = '24h'): Promise<UsageSnapshot> {
    const response = await v1ApiClient.get<any>(`/v1/usage?range=${range}`);
    const parsed = V1EnvelopeSchema(V1UsageSchema).parse(response);
    return parsed.data;
  },
};

export type ExportResource = {
  id: string;
  name: string;
  metric: string;
  stationId: string | null;
  stationName: string;
  windowStart: string;
  windowEnd: string;
  format: 'csv' | 'json' | 'parquet';
  status: 'queued' | 'running' | 'ready' | 'failed' | 'expired';
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  expiresAt: string | null;
  recordCount: number | null;
  sizeBytes: number | null;
  progressPct: number;
  errorMessage: string | null;
};

const toExport = (raw: z.infer<typeof V1ExportSchema>): ExportResource => ({
  id: raw.id,
  name: raw.name,
  metric: raw.metric,
  stationId: raw.station_id,
  stationName: raw.station_name,
  windowStart: raw.window_start,
  windowEnd: raw.window_end,
  format: raw.format,
  status: raw.status,
  requestedAt: raw.requested_at,
  startedAt: raw.started_at,
  finishedAt: raw.finished_at,
  expiresAt: raw.expires_at,
  recordCount: raw.record_count,
  sizeBytes: raw.size_bytes,
  progressPct: raw.progress_pct,
  errorMessage: raw.error_message,
});

export type CreateExportInput = {
  name: string;
  metric: string;
  stationId?: string;
  stationName: string;
  windowStart: string;
  windowEnd: string;
  format: 'csv' | 'json' | 'parquet';
};

export const exportService = {
  async list(): Promise<ExportResource[]> {
    const response = await v1ApiClient.get<any>('/v1/exports');
    const parsed = V1EnvelopeSchema(V1ExportSchema.array()).parse(response);
    return parsed.data.map(toExport);
  },

  async create(input: CreateExportInput): Promise<ExportResource> {
    const body = {
      name: input.name,
      metric: input.metric,
      station_id: input.stationId,
      station_name: input.stationName,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      format: input.format,
    };
    const response = await v1ApiClient.post<any>('/v1/exports', body);
    const parsed = V1EnvelopeSchema(V1ExportSchema).parse(response);
    return toExport(parsed.data);
  },

  async cancel(id: string): Promise<ExportResource> {
    const response = await v1ApiClient.post<any>(`/v1/exports/${id}/cancel`, {});
    const parsed = V1EnvelopeSchema(V1ExportSchema).parse(response);
    return toExport(parsed.data);
  },

  async delete(id: string): Promise<void> {
    await v1ApiClient.delete<unknown>(`/v1/exports/${id}`);
  },

  downloadHref(id: string): string {
    return `${config.apiUrl}/v1/exports/${id}/download`;
  },

  async downloadBlob(id: string): Promise<Blob> {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('wh.research.activeApiToken')
        : null;
    const res = await fetch(`${config.apiUrl}/v1/exports/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      throw new ApiError(`Download failed: HTTP ${res.status}`, res.status);
    }
    return res.blob();
  },
};

export type AccountResource = {
  notifications: {
    weeklyDigest: boolean;
    rateLimitWarnings: boolean;
    breakingChanges: boolean;
    anchorCompletion: boolean;
    grantUpdates: boolean;
  };
  citationFormat: 'apa' | 'mla' | 'chicago' | 'bibtex';
  autoCite: boolean;
  activeTokenId: string | null;
  orcid: string | null;
  affiliation: string | null;
};

const toAccount = (raw: z.infer<typeof V1AccountSchema>): AccountResource => ({
  notifications: raw.notifications,
  citationFormat: raw.citation_format,
  autoCite: raw.auto_cite,
  activeTokenId: raw.active_token_id,
  orcid: raw.orcid,
  affiliation: raw.affiliation,
});

export type AccountPatchInput = Partial<{
  notifications: Partial<AccountResource['notifications']>;
  citationFormat: AccountResource['citationFormat'];
  autoCite: boolean;
  activeTokenId: string | null;
  orcid: string | null;
  affiliation: string | null;
}>;

export const accountService = {
  async get(): Promise<AccountResource> {
    const response = await v1ApiClient.get<any>('/v1/account');
    const parsed = V1EnvelopeSchema(V1AccountSchema).parse(response);
    return toAccount(parsed.data);
  },

  async patch(patch: AccountPatchInput): Promise<AccountResource> {
    const body: Record<string, unknown> = {};
    if (patch.notifications !== undefined) body.notifications = patch.notifications;
    if (patch.citationFormat !== undefined) body.citationFormat = patch.citationFormat;
    if (patch.autoCite !== undefined) body.autoCite = patch.autoCite;
    if (patch.activeTokenId !== undefined) body.activeTokenId = patch.activeTokenId;
    if (patch.orcid !== undefined) body.orcid = patch.orcid;
    if (patch.affiliation !== undefined) body.affiliation = patch.affiliation;
    const response = await v1ApiClient.patch<any>('/v1/account', body);
    const parsed = V1EnvelopeSchema(V1AccountSchema).parse(response);
    return toAccount(parsed.data);
  },
};

export type GrantResource = {
  id: string;
  targetTenant: string;
  scope: string;
  status: 'pending' | 'active' | 'revoked';
  grantedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const toGrant = (raw: z.infer<typeof V1GrantSchema>): GrantResource => ({
  id: raw.id,
  targetTenant: raw.target_tenant,
  scope: raw.scope,
  status: raw.status,
  grantedAt: raw.granted_at,
  expiresAt: raw.expires_at,
  revokedAt: raw.revoked_at,
  createdAt: raw.created_at,
});

export type RequestGrantInput = {
  targetTenant: string;
  scope: string;
  expiresAt?: string;
};

export const grantService = {
  async list(): Promise<GrantResource[]> {
    const response = await v1ApiClient.get<any>('/v1/grants');
    const parsed = V1EnvelopeSchema(V1GrantSchema.array()).parse(response);
    return parsed.data.map(toGrant);
  },

  async request(input: RequestGrantInput): Promise<GrantResource> {
    const body = {
      target_tenant: input.targetTenant,
      scope: input.scope,
      expires_at: input.expiresAt,
    };
    const response = await v1ApiClient.post<any>('/v1/grants/request', body);
    const parsed = V1EnvelopeSchema(V1GrantSchema).parse(response);
    return toGrant(parsed.data);
  },

  async revoke(id: string): Promise<GrantResource> {
    const response = await v1ApiClient.delete<any>(`/v1/grants/${id}`);
    const parsed = V1EnvelopeSchema(V1GrantSchema).parse(response);
    return toGrant(parsed.data);
  },
};
