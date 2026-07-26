export const ROLE_PERMISSIONS = {
  admin: ['view', 'edit', 'delete', 'manage_alerts', 'manage_users', 'export'],
  researcher: ['view', 'edit', 'export', 'manage_own_alerts'],
  viewer: ['view'],
} as const;

export const METRIC_CONFIG = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    range: { min: -50, max: 60 },
    decimals: 1,
  },
  humidity: {
    label: 'Humidity',
    unit: '%',
    range: { min: 0, max: 100 },
    decimals: 1,
  },
  pressure: {
    label: 'Pressure',
    unit: 'hPa',
    range: { min: 800, max: 1200 },
    decimals: 1,
  },
  rainfall: {
    label: 'Rainfall',
    unit: 'mm',
    range: { min: 0, max: 500 },
    decimals: 2,
  },
  light: {
    label: 'Light Intensity',
    unit: 'lux',
    range: { min: 0, max: 200000 },
    decimals: 0,
  },
  airQuality: {
    label: 'Air Quality',
    unit: 'AQI',
    range: { min: 0, max: 500 },
    decimals: 0,
  },
} as const;

export const SEVERITY_CONFIG = {
  info: {
    label: 'Info',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    borderColor: 'border-blue-300',
  },
  warning: {
    label: 'Warning',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    borderColor: 'border-yellow-300',
  },
  critical: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    borderColor: 'border-red-300',
  },
} as const;

export const STATUS_CONFIG = {
  open: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  acknowledged: {
    label: 'Acknowledged',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
} as const;

export const STATION_STATUS_CONFIG = {
  online: {
    label: 'Online',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dot: 'bg-green-500',
  },
  offline: {
    label: 'Offline',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    dot: 'bg-red-500',
  },
  maintenance: {
    label: 'Maintenance',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
} as const;

export const SIGNAL_STRENGTH_CONFIG = {
  excellent: {
    label: 'Excellent',
    bars: 4,
    color: 'text-green-600',
  },
  good: {
    label: 'Good',
    bars: 3,
    color: 'text-green-500',
  },
  fair: {
    label: 'Fair',
    bars: 2,
    color: 'text-yellow-500',
  },
  poor: {
    label: 'Poor',
    bars: 1,
    color: 'text-red-500',
  },
  none: {
    label: 'No Signal',
    bars: 0,
    color: 'text-gray-400',
  },
} as const;

export const TIME_RANGES = [
  { label: 'Last 24 hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: 'Last 7 days', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Last 30 days', value: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Last 90 days', value: '90d', ms: 90 * 24 * 60 * 60 * 1000 },
] as const;

export const FORECAST_HORIZONS = [
  { label: '1 hour', value: '1h' },
  { label: '3 hours', value: '3h' },
  { label: '6 hours', value: '6h' },
  { label: '24 hours', value: '24h' },
] as const;

export const AGGREGATION_INTERVALS = [
  { label: 'Raw', value: 'raw' },
  { label: '5 minutes', value: '5m' },
  { label: '15 minutes', value: '15m' },
  { label: '1 hour', value: '1h' },
  { label: '1 day', value: '1d' },
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const API_TIMEOUT = 30000; // 30 seconds
export const RETRY_ATTEMPTS = 3;
export const RETRY_DELAY = 1000; // 1 second

export const SSE_RETRY_INTERVAL = 5000; // 5 seconds
export const SSE_HEARTBEAT_TIMEOUT = 30000; // 30 seconds

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'weather_station_auth_token',
  USER_PREFERENCES: 'weather_station_user_preferences',
  THEME: 'weather_station_theme',
  SIDEBAR_OPEN: 'weather_station_sidebar_open',
} as const;

export const CACHE_DURATION = {
  STATIONS: 5 * 60 * 1000, // 5 minutes
  READINGS_LATEST: 30 * 1000, // 30 seconds (short due to live updates)
  READINGS_HISTORY: 5 * 60 * 1000, // 5 minutes
  FORECASTS: 10 * 60 * 1000, // 10 minutes
  ALERTS: 2 * 60 * 1000, // 2 minutes
  INTEGRITY: 10 * 60 * 1000, // 10 minutes
  USER: 30 * 60 * 1000, // 30 minutes
} as const;

export const EMPTY_STATES = {
  NO_READINGS: "No weather readings available yet. The station may still be collecting data.",
  NO_ALERTS: "No alerts at this time. Your campus is operating normally.",
  NO_FORECAST: "Forecast is not available at this moment. Try again shortly.",
  NO_INTEGRITY_ANCHORS: "No integrity anchors have been created yet. Data will be anchored once the system is ready.",
  NO_STATIONS: "No weather stations configured. Please contact your administrator.",
} as const;

export const SYSTEM_MESSAGES = {
  OFFLINE: "System is currently offline. Operating in local mode with cached data.",
  DISCONNECTED: "Connection lost to the live data stream. Reconnecting...",
  RECONNECTING: "Attempting to reconnect to the data stream...",
  SYNCING: "Synchronizing data with the server...",
  ERROR_LOADING: "Failed to load data. Please try again.",
  ERROR_SAVING: "Failed to save changes. Please try again.",
} as const;

export const VERIFICATION_STATUS = {
  VERIFIED: "Verified on Hedera",
  PENDING: "Pending verification",
  FAILED: "Verification failed",
  NOT_FOUND: "Record not found in batch",
} as const;
