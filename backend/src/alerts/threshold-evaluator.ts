import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { AlertSeverity } from './entities/alert.entity';

export interface ThresholdBreach {
  metric: string;
  actualValue: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
}

interface Rule {
  metric: string;
  field: keyof WeatherReading;
  direction: 'above' | 'below';
  threshold: number;
  severity: AlertSeverity;
  unit: string;
}

const RULES: Rule[] = [
  { metric: 'temperature', field: 'temperatureC', direction: 'above', threshold: 40, severity: 'critical', unit: '°C' },
  { metric: 'temperature', field: 'temperatureC', direction: 'above', threshold: 35, severity: 'warning', unit: '°C' },
  { metric: 'temperature', field: 'temperatureC', direction: 'below', threshold: 0, severity: 'warning', unit: '°C' },
  { metric: 'humidity', field: 'humidityPct', direction: 'above', threshold: 90, severity: 'warning', unit: '%' },
  { metric: 'humidity', field: 'humidityPct', direction: 'below', threshold: 15, severity: 'warning', unit: '%' },
  { metric: 'pressure', field: 'pressureHpa', direction: 'below', threshold: 985, severity: 'warning', unit: 'hPa' },
  { metric: 'pressure', field: 'pressureHpa', direction: 'below', threshold: 970, severity: 'critical', unit: 'hPa' },
  { metric: 'rainfall', field: 'rainfallMm', direction: 'above', threshold: 10, severity: 'warning', unit: 'mm' },
  { metric: 'rainfall', field: 'rainfallMm', direction: 'above', threshold: 25, severity: 'critical', unit: 'mm' },
  { metric: 'airQuality', field: 'airQualityValue', direction: 'above', threshold: 150, severity: 'warning', unit: 'AQI' },
  { metric: 'airQuality', field: 'airQualityValue', direction: 'above', threshold: 200, severity: 'critical', unit: 'AQI' },
  { metric: 'battery', field: 'batteryVoltage', direction: 'below', threshold: 3.5, severity: 'warning', unit: 'V' },
  { metric: 'battery', field: 'batteryVoltage', direction: 'below', threshold: 3.3, severity: 'critical', unit: 'V' },
  { metric: 'signal', field: 'signalRssi', direction: 'below', threshold: -85, severity: 'warning', unit: 'dBm' },
];

export function evaluateReading(reading: WeatherReading): ThresholdBreach[] {
  const candidates: ThresholdBreach[] = [];
  for (const rule of RULES) {
    const raw = reading[rule.field];
    if (raw == null || typeof raw !== 'number') continue;
    const breached =
      rule.direction === 'above' ? raw > rule.threshold : raw < rule.threshold;
    if (!breached) continue;
    candidates.push({
      metric: rule.metric,
      actualValue: raw,
      threshold: rule.threshold,
      severity: rule.severity,
      message: buildMessage(rule, raw),
    });
  }
  return collapseBySeverity(candidates);
}

function buildMessage(rule: Rule, value: number): string {
  const verb = rule.direction === 'above' ? 'exceeded' : 'dropped below';
  const rounded = Math.round(value * 100) / 100;
  return `${capitalize(rule.metric)} ${verb} ${rule.threshold}${rule.unit} (current: ${rounded}${rule.unit})`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function collapseBySeverity(breaches: ThresholdBreach[]): ThresholdBreach[] {
  const severityRank: Record<AlertSeverity, number> = { info: 0, warning: 1, critical: 2 };
  const byMetric = new Map<string, ThresholdBreach>();
  for (const b of breaches) {
    const existing = byMetric.get(b.metric);
    if (!existing || severityRank[b.severity] > severityRank[existing.severity]) {
      byMetric.set(b.metric, b);
    }
  }
  return Array.from(byMetric.values());
}
