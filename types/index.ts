// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'researcher' | 'viewer';

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

// Station Types
export interface Station {
  id: string;
  name: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  status: 'online' | 'offline' | 'maintenance';
  lastSyncedAt: string | null;
  enabledSensors: SensorType[];
  createdAt: string;
  updatedAt: string;
}

export type SensorType = 'temperature' | 'humidity' | 'pressure' | 'rainfall' | 'light' | 'airQuality' | 'battery' | 'signal';

// Weather Reading Types
export interface WeatherReading {
  id: string;
  stationId: string;
  deviceId?: string | null;
  recordedAt: string;
  receivedAt: string;
  temperatureC?: number | null;
  humidityPct?: number | null;
  pressureHpa?: number | null;
  rainfallMm?: number | null;
  lightLux?: number | null;
  airQualityValue?: number | null;
  batteryVoltage?: number | null;
  signalRssi?: number | null;
}

export interface WeatherSummary {
  stationId: string;
  metric: 'temperature' | 'humidity' | 'pressure' | 'rainfall' | 'light' | 'airQuality';
  period: string;
  min: number;
  max: number;
  avg: number;
  trend: 'up' | 'down' | 'stable';
  dataCount: number;
}

export interface DeviceStatus {
  stationId: string;
  lastReceivedAt: string;
  signalStrength: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  batteryLevel?: number;
  memoryUsage?: number;
  uptime?: number;
  recordsProcessed?: number;
}

// Forecast Types
export interface Forecast {
  id: string;
  stationId: string;
  generatedAt: string;
  validFrom: string;
  validTo: string;
  items: ForecastItem[];
  confidence: number;
  explanation: string;
}

export interface ForecastItem {
  timestamp: string;
  metric: 'temperature' | 'humidity' | 'pressure' | 'rainfall';
  predictedValue: number;
  confidence: number;
}

// Alert Types
export interface Alert {
  id: string;
  stationId: string;
  metric: string;
  threshold: number;
  actualValue: number;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

// Integrity / Blockchain Types
export interface IntegrityBatch {
  id: string;
  stationId: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  recordCount: number;
  merkleRoot?: string;
  dataHash?: string;
  hederaTopicId: string;
  hederaSequenceNumber: number;
  hederaTransactionId: string;
  consensusTimestamp: string;
  mirrorNodeVerified: boolean;
  /** False only for a genuine Hedera submit — true for the local stub. */
  simulated: boolean;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface RecordVerificationResult {
  recordId: string;
  stationId: string;
  recordHash: string;
  computedHash: string;
  hashMatch: boolean;
  batchId?: string;
  batchMembership: boolean;
  hederaTopicId?: string;
  hederaSequenceNumber?: number;
  hederaTransactionId?: string;
  consensusTimestamp?: string;
  mirrorNodeVerified: boolean;
  simulated?: boolean;
  verificationMessage: string;
}

// API Request/Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReadingsHistoryParams {
  stationId: string;
  from: string;
  to: string;
  interval?: 'raw' | '5m' | '15m' | '1h' | '1d';
}

export interface ForecastParams {
  stationId: string;
  horizon?: '1h' | '3h' | '6h' | '24h';
}

export interface AlertsParams {
  stationId?: string;
  status?: 'open' | 'acknowledged' | 'resolved';
  severity?: 'info' | 'warning' | 'critical';
  from?: string;
  to?: string;
}

export interface IntegrityBatchParams {
  stationId?: string;
  from?: string;
  to?: string;
}

// Mock Data Detection
export interface MockMetadata {
  isMockData: boolean;
  generatedAt: string;
  note?: string;
}
