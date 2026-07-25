import { Station, WeatherReading, Forecast, ForecastItem, Alert, IntegrityBatch, User, WeatherSummary, DeviceStatus } from '@/types';

export const mockUser: User = {
  id: 'user-001',
  email: 'chiheb@enit.utm.tn',
  name: 'Dr. Chiheb',
  role: 'admin',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-04-20T12:00:00Z',
};

export const mockStations: Station[] = [
  {
    id: 'station-001',
    name: 'ENIT Campus Weather Station',
    location: 'Rooftop, Bloc A · Le Belvédère, Tunis',
    latitude: 36.8344,
    longitude: 10.0583,
    status: 'online',
    lastSyncedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    enabledSensors: ['temperature', 'humidity', 'pressure', 'rainfall', 'light', 'airQuality', 'battery', 'signal'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-04-20T12:00:00Z',
  },
];

export const generateMockWeatherReadings = (count: number = 10): WeatherReading[] => {
  const readings: WeatherReading[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = now - i * 5 * 60 * 1000; // 5-minute intervals
    readings.push({
      id: `reading-${i}`,
      stationId: 'station-001',
      recordedAt: new Date(timestamp).toISOString(),
      receivedAt: new Date(timestamp + 2000).toISOString(),
      temperatureC: 18 + Math.sin(i * 0.5) * 5 + Math.random() * 2,
      humidityPct: 55 + Math.cos(i * 0.3) * 20 + Math.random() * 5,
      pressureHpa: 1013 + Math.sin(i * 0.2) * 3 + Math.random() * 1,
      rainfallMm: Math.random() < 0.1 ? Math.random() * 2 : 0,
      lightLux: Math.max(0, 10000 + Math.sin(i * 0.4) * 5000 + Math.random() * 1000),
      airQualityValue: 45 + Math.random() * 20,
      batteryVoltage: 4.2 - i * 0.002,
      signalRssi: -55 - Math.random() * 20,
    });
  }

  return readings;
};

export const generateMockWeatherSummary = (metric: 'temperature' | 'humidity' | 'pressure' | 'rainfall' | 'light' | 'airQuality'): WeatherSummary => {
  const readings = generateMockWeatherReadings(100);
  const values = readings
    .map((r) => {
      switch (metric) {
        case 'temperature':
          return r.temperatureC || 0;
        case 'humidity':
          return r.humidityPct || 0;
        case 'pressure':
          return r.pressureHpa || 0;
        case 'rainfall':
          return r.rainfallMm || 0;
        case 'light':
          return r.lightLux || 0;
        case 'airQuality':
          return r.airQualityValue || 0;
        default:
          return 0;
      }
    })
    .filter((v) => v !== null && v !== undefined);

  return {
    stationId: 'station-001',
    metric,
    period: '24h',
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    trend: Math.random() > 0.5 ? 'up' : 'down',
    dataCount: values.length,
  };
};

export const mockDeviceStatus: DeviceStatus = {
  stationId: 'station-001',
  lastReceivedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  signalStrength: 'excellent',
  batteryLevel: 92,
  memoryUsage: 45,
  uptime: 2592000,
  recordsProcessed: 8760,
};

export const generateMockForecast = (): Forecast => {
  const now = new Date();
  const items: ForecastItem[] = [];

  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(now.getTime() + i * 15 * 60 * 1000);
    items.push({
      timestamp: timestamp.toISOString(),
      metric: 'temperature' as const,
      predictedValue: 18 + Math.sin(i * 0.5) * 5,
      confidence: 95 - i * 2,
    });
  }

  return {
    id: 'forecast-001',
    stationId: 'station-001',
    generatedAt: now.toISOString(),
    validFrom: now.toISOString(),
    validTo: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
    items,
    confidence: 88,
    explanation: 'Based on local pressure and humidity trends observed over the last 6 hours.',
  };
};

export const generateMockAlerts = (): Alert[] => {
  return [
    {
      id: 'alert-001',
      stationId: 'station-001',
      metric: 'temperature',
      threshold: 35,
      actualValue: 32.5,
      severity: 'warning',
      status: 'open',
      message: 'Temperature approaching critical threshold',
      triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-002',
      stationId: 'station-001',
      metric: 'humidity',
      threshold: 90,
      actualValue: 78.5,
      severity: 'info',
      status: 'acknowledged',
      message: 'High humidity levels detected',
      triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      acknowledgedBy: 'chiheb@enit.utm.tn',
    },
    {
      id: 'alert-003',
      stationId: 'station-001',
      metric: 'rainfall',
      threshold: 25,
      actualValue: 2.3,
      severity: 'info',
      status: 'resolved',
      message: 'Light rain detected',
      triggeredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 3.8 * 60 * 60 * 1000).toISOString(),
      acknowledgedBy: 'chiheb@enit.utm.tn',
      resolvedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      resolvedBy: 'chiheb@enit.utm.tn',
    },
  ];
};

export const generateMockIntegrityBatches = (): IntegrityBatch[] => {
  const now = new Date();
  return [
    {
      id: 'batch-001',
      stationId: 'station-001',
      timeWindowStart: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      timeWindowEnd: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
      recordCount: 288,
      merkleRoot: 'a7f3e8c1d4b2f9a5e1c8d6b4f2a9e7c5d3b1f8a6e4c2b0f9d7e5c3a1b8f6d4',
      dataHash: 'sha256_hash_value_here',
      hederaTopicId: '0.0.1234567',
      hederaSequenceNumber: 42,
      hederaTransactionId: '0.0.7654321@1713607200.123456789',
      consensusTimestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      mirrorNodeVerified: false,
      simulated: true,
      verifiedAt: new Date(now.getTime() - 19 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'batch-002',
      stationId: 'station-001',
      timeWindowStart: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
      timeWindowEnd: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
      recordCount: 288,
      merkleRoot: 'b8g4f9d2e5c3a7b1f8d6e4c2a9b7f5d3e1c8b6a4f2d0e8c6b4a2f9d7e5c3a1',
      dataHash: 'sha256_hash_value_here',
      hederaTopicId: '0.0.1234567',
      hederaSequenceNumber: 41,
      hederaTransactionId: '0.0.7654321@1713603600.987654321',
      consensusTimestamp: new Date(now.getTime() - 21 * 60 * 60 * 1000).toISOString(),
      mirrorNodeVerified: false,
      simulated: true,
      verifiedAt: new Date(now.getTime() - 20.5 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

// SSE Event stream generator
export const generateMockSSEReadings = (): WeatherReading => {
  const now = new Date();
  return {
    id: `reading-sse-${Date.now()}`,
    stationId: 'station-001',
    recordedAt: now.toISOString(),
    receivedAt: new Date(now.getTime() + 1000).toISOString(),
    temperatureC: 18 + Math.sin(Date.now() / 10000) * 5 + Math.random() * 2,
    humidityPct: 55 + Math.cos(Date.now() / 15000) * 20 + Math.random() * 5,
    pressureHpa: 1013 + Math.sin(Date.now() / 20000) * 3 + Math.random() * 1,
    rainfallMm: Math.random() < 0.01 ? Math.random() * 0.5 : 0,
    lightLux: Math.max(0, 10000 + Math.sin(Date.now() / 8000) * 5000 + Math.random() * 1000),
    airQualityValue: 45 + Math.random() * 20,
    batteryVoltage: 4.1 + Math.random() * 0.1,
    signalRssi: -55 - Math.random() * 20,
  };
};

export const generateMockSSEAlert = (): Alert => {
  const now = new Date();
  const metrics = ['temperature', 'humidity', 'pressure', 'rainfall'];
  const metric = metrics[Math.floor(Math.random() * metrics.length)];
  const severities: Array<'info' | 'warning' | 'critical'> = ['info', 'warning', 'critical'];
  const severity = severities[Math.floor(Math.random() * severities.length)];

  return {
    id: `alert-sse-${Date.now()}`,
    stationId: 'station-001',
    metric,
    threshold: Math.random() * 100,
    actualValue: Math.random() * 100,
    severity,
    status: 'open',
    message: `${metric} threshold alert`,
    triggeredAt: now.toISOString(),
  };
};
