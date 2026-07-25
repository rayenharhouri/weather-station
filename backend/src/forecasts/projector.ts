import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { ForecastHorizon, ForecastItem } from './entities/forecast.entity';

type ProjectedMetric = 'temperature' | 'humidity' | 'pressure' | 'rainfall';

const METRIC_FIELD: Record<ProjectedMetric, keyof WeatherReading> = {
  temperature: 'temperatureC',
  humidity: 'humidityPct',
  pressure: 'pressureHpa',
  rainfall: 'rainfallMm',
};

interface HorizonSpec {
  /** Total span we project forward, in minutes. */
  spanMinutes: number;
  /** Cadence of projection samples, in minutes. */
  stepMinutes: number;
}

const HORIZON: Record<ForecastHorizon, HorizonSpec> = {
  '1h': { spanMinutes: 60, stepMinutes: 15 },
  '3h': { spanMinutes: 3 * 60, stepMinutes: 15 },
  '6h': { spanMinutes: 6 * 60, stepMinutes: 30 },
  '24h': { spanMinutes: 24 * 60, stepMinutes: 60 },
};

export interface ProjectionResult {
  items: ForecastItem[];
  confidence: number;
  explanation: string;
}

/**
 * Project the next N readings for a station using simple statistics.
 *
 * - temperature / humidity / pressure: ordinary least-squares linear fit
 *   over the input history; projected forward at the horizon's cadence.
 *   Confidence comes from the fit's R² (clamped 30–95%).
 * - rainfall: the field is mostly zero, so a regression overshoots wildly.
 *   We use the recent mean instead, with confidence anchored to "how
 *   stable was the recent past." Phase 5+ can swap in a real model.
 *
 * `history` should be ordered oldest-first. We tolerate gaps and nulls.
 */
export function project(history: WeatherReading[], horizon: ForecastHorizon): ProjectionResult {
  const spec = HORIZON[horizon];
  const samples = Math.max(1, Math.floor(spec.spanMinutes / spec.stepMinutes));
  const now = history.length > 0 ? new Date(history[history.length - 1].recordedAt) : new Date();
  const items: ForecastItem[] = [];
  const perMetricConfidence: number[] = [];

  for (const metric of Object.keys(METRIC_FIELD) as ProjectedMetric[]) {
    const field = METRIC_FIELD[metric];
    const series = history
      .map((r) => ({ t: new Date(r.recordedAt).getTime(), y: r[field] as number | null }))
      .filter((p): p is { t: number; y: number } => p.y != null && Number.isFinite(p.y));

    if (series.length < 3) {
      // Not enough data — emit a flat projection at the most recent value
      // (or zero if we have nothing at all) with floor-confidence so the UI
      // can still render a line.
      const last = series[series.length - 1]?.y ?? 0;
      const baseConfidence = 30;
      perMetricConfidence.push(baseConfidence);
      for (let i = 1; i <= samples; i++) {
        items.push({
          timestamp: addMinutes(now, i * spec.stepMinutes),
          metric,
          predictedValue: round(last, 2),
          confidence: baseConfidence,
        });
      }
      continue;
    }

    if (metric === 'rainfall') {
      // Recent mean rather than regression — rainfall is sparse and
      // sub-zero predictions are nonsensical.
      const recent = series.slice(-Math.min(series.length, 24));
      const mean = average(recent.map((p) => p.y));
      const variability = stddev(recent.map((p) => p.y));
      const confidence = clamp(85 - variability * 25, 30, 92);
      perMetricConfidence.push(confidence);
      for (let i = 1; i <= samples; i++) {
        items.push({
          timestamp: addMinutes(now, i * spec.stepMinutes),
          metric,
          predictedValue: Math.max(0, round(mean, 2)),
          confidence: round(confidence, 1),
        });
      }
      continue;
    }

    const fit = linearFit(series);
    const baseConfidence = clamp(30 + fit.rSquared * 65, 30, 95);
    perMetricConfidence.push(baseConfidence);
    for (let i = 1; i <= samples; i++) {
      const t = now.getTime() + i * spec.stepMinutes * 60_000;
      const predicted = fit.a + fit.b * t;
      // Confidence decays with horizon distance — model trust is highest
      // a few steps out, falls off the further we extrapolate.
      const decay = 1 - (i / samples) * 0.25;
      items.push({
        timestamp: new Date(t).toISOString(),
        metric,
        predictedValue: round(predicted, 2),
        confidence: round(baseConfidence * decay, 1),
      });
    }
  }

  const overall = round(average(perMetricConfidence), 1);
  return {
    items,
    confidence: overall,
    explanation: explanationFor(history, horizon),
  };
}

interface FitResult {
  a: number;
  b: number;
  rSquared: number;
}

/** Ordinary least squares fit `y = a + b*t`. */
function linearFit(points: Array<{ t: number; y: number }>): FitResult {
  const n = points.length;
  let sumT = 0,
    sumY = 0,
    sumTY = 0,
    sumTT = 0;
  for (const p of points) {
    sumT += p.t;
    sumY += p.y;
    sumTY += p.t * p.y;
    sumTT += p.t * p.t;
  }
  const denom = n * sumTT - sumT * sumT;
  if (denom === 0) return { a: sumY / n, b: 0, rSquared: 0 };
  const b = (n * sumTY - sumT * sumY) / denom;
  const a = (sumY - b * sumT) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const yhat = a + b * p.t;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yhat) ** 2;
  }
  const rSquared = ssTot > 0 ? clamp(1 - ssRes / ssTot, 0, 1) : 0;
  return { a, b, rSquared };
}

function explanationFor(history: WeatherReading[], horizon: ForecastHorizon): string {
  const windowH = HORIZON[horizon].spanMinutes / 60;
  const n = history.length;
  if (n === 0) {
    return `No recent readings available — projection falls back to zero/flat values. Confidence is low.`;
  }
  return `Linear projection over the last ${n} readings, extrapolated to the next ${windowH}h. Rainfall uses a recent-mean heuristic; other metrics use ordinary least-squares fits.`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = average(values);
  const variance = average(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number, decimals: number): number {
  const m = 10 ** decimals;
  return Math.round(v * m) / m;
}

function addMinutes(from: Date, minutes: number): string {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}
