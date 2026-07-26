import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { hashReading, inclusionProof, merkleRoot, verifyProof } from './merkle';

function reading(overrides: Partial<WeatherReading> = {}): WeatherReading {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    stationId: '22222222-2222-2222-2222-222222222222',
    recordedAt: new Date('2026-05-21T10:00:00Z'),
    receivedAt: new Date('2026-05-21T10:00:01Z'),
    deviceId: 'esp32-test',
    temperatureC: 23.5,
    humidityPct: 62.1,
    pressureHpa: 1013.2,
    rainfallMm: 0,
    lightLux: 12000,
    airQualityValue: 42,
    batteryVoltage: 3.92,
    signalRssi: -58,
    ...overrides,
  } as WeatherReading;
}

describe('hashReading', () => {
  it('is deterministic for the same input', () => {
    const r = reading();
    expect(hashReading(r)).toBe(hashReading(r));
  });

  it('changes when any field changes', () => {
    const base = hashReading(reading());
    expect(hashReading(reading({ temperatureC: 23.6 }))).not.toBe(base);
    expect(hashReading(reading({ stationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }))).not.toBe(base);
    expect(hashReading(reading({ recordedAt: new Date('2026-05-21T10:00:01Z') }))).not.toBe(base);
  });

  it('treats null and 0 distinctly', () => {
    expect(hashReading(reading({ rainfallMm: null }))).not.toBe(hashReading(reading({ rainfallMm: 0 })));
  });

  it('ignores trailing-zero formatting jitter on numeric fields', () => {
    expect(hashReading(reading({ temperatureC: 23.5 }))).toBe(
      hashReading(reading({ temperatureC: 23.5000001 })),
    );
  });
});

describe('merkleRoot', () => {
  it('throws on empty input', () => {
    expect(() => merkleRoot([])).toThrow(/at least one leaf/);
  });

  it('returns the leaf itself when there is only one', () => {
    const h = hashReading(reading());
    expect(merkleRoot([h])).toBe(h);
  });

  it('is deterministic across runs', () => {
    const leaves = [hashReading(reading({ id: 'a' as any })), hashReading(reading({ id: 'b' as any }))];
    expect(merkleRoot(leaves)).toBe(merkleRoot(leaves));
  });

  it('duplicates the last leaf on odd-count levels (Bitcoin-style)', () => {
    const a = hashReading(reading({ id: 'a' as any }));
    const b = hashReading(reading({ id: 'b' as any }));
    const c = hashReading(reading({ id: 'c' as any }));
    const r3 = merkleRoot([a, b, c]);
    const r2 = merkleRoot([a, b]);
    expect(r3).not.toBe(r2);
    expect(merkleRoot([a, b, c])).toBe(r3);
  });
});

describe('inclusionProof + verifyProof', () => {
  const leaves = Array.from({ length: 8 }, (_, i) =>
    hashReading(reading({ id: `id-${i}` as any })),
  );
  const root = merkleRoot(leaves);

  it('verifies every leaf', () => {
    for (let i = 0; i < leaves.length; i++) {
      const proof = inclusionProof(leaves, i);
      expect(verifyProof(leaves[i], proof, root)).toBe(true);
    }
  });

  it('rejects a tampered leaf', () => {
    const proof = inclusionProof(leaves, 3);
    expect(verifyProof('deadbeef'.repeat(8), proof, root)).toBe(false);
  });

  it('rejects a proof for the wrong root', () => {
    const proof = inclusionProof(leaves, 3);
    expect(verifyProof(leaves[3], proof, 'a'.repeat(64))).toBe(false);
  });

  it('throws on out-of-bounds index', () => {
    expect(() => inclusionProof(leaves, -1)).toThrow();
    expect(() => inclusionProof(leaves, leaves.length)).toThrow();
  });
});
