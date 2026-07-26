import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { evaluateReading } from './threshold-evaluator';

function reading(over: Partial<WeatherReading> = {}): WeatherReading {
  return {
    id: 'r',
    stationId: 's',
    recordedAt: new Date(),
    receivedAt: new Date(),
    deviceId: null,
    temperatureC: null,
    humidityPct: null,
    pressureHpa: null,
    rainfallMm: null,
    lightLux: null,
    airQualityValue: null,
    batteryVoltage: null,
    signalRssi: null,
    ...over,
  } as WeatherReading;
}

describe('threshold-evaluator', () => {
  it('produces no breaches for a benign reading', () => {
    expect(
      evaluateReading(
        reading({ temperatureC: 22, humidityPct: 50, pressureHpa: 1013, rainfallMm: 0 }),
      ),
    ).toEqual([]);
  });

  it('fires the higher severity when both warning and critical match', () => {
    const breaches = evaluateReading(reading({ temperatureC: 41 }));
    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({ metric: 'temperature', severity: 'critical' });
  });

  it('fires independent metrics independently', () => {
    const breaches = evaluateReading(
      reading({ temperatureC: 36, humidityPct: 92, batteryVoltage: 3.2 }),
    );
    const metrics = breaches.map((b) => b.metric).sort();
    expect(metrics).toEqual(['battery', 'humidity', 'temperature']);
  });

  it('ignores null metrics', () => {
    const breaches = evaluateReading(reading({ batteryVoltage: null }));
    expect(breaches.every((b) => b.metric !== 'battery')).toBe(true);
  });

  it('produces a human-readable message with units', () => {
    const [breach] = evaluateReading(reading({ temperatureC: 41 }));
    expect(breach.message).toMatch(/Temperature.*40°C/);
  });
});
