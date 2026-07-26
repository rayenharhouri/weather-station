import { createHash } from 'node:crypto';
import { WeatherReading } from '../readings/entities/weather-reading.entity';

export function hashReading(r: WeatherReading): string {
  const canonical = [
    r.id,
    r.stationId,
    iso(r.recordedAt),
    fmtNum(r.temperatureC),
    fmtNum(r.humidityPct),
    fmtNum(r.pressureHpa),
    fmtNum(r.rainfallMm),
    fmtNum(r.lightLux),
    fmtNum(r.airQualityValue),
    fmtNum(r.batteryVoltage),
    fmtNum(r.signalRssi),
  ].join('|');
  return sha256Hex(canonical);
}

export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) {
    throw new Error('merkleRoot: at least one leaf required');
  }
  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256Hex(left + right));
    }
    level = next;
  }
  return level[0];
}

export interface ProofStep {
  hash: string;
  side: 'left' | 'right';
}

export function inclusionProof(leaves: string[], leafIndex: number): ProofStep[] {
  if (leafIndex < 0 || leafIndex >= leaves.length) {
    throw new Error(`inclusionProof: leafIndex ${leafIndex} out of bounds (n=${leaves.length})`);
  }
  const proof: ProofStep[] = [];
  let level = leaves.slice();
  let idx = leafIndex;
  while (level.length > 1) {
    const isRightChild = idx % 2 === 1;
    const siblingIdx = isRightChild ? idx - 1 : idx + 1;
    const sibling = siblingIdx < level.length ? level[siblingIdx] : level[idx];
    proof.push({ hash: sibling, side: isRightChild ? 'left' : 'right' });

    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256Hex(left + right));
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function verifyProof(leafHash: string, proof: ProofStep[], expectedRoot: string): boolean {
  let acc = leafHash;
  for (const step of proof) {
    acc =
      step.side === 'left'
        ? sha256Hex(step.hash + acc)
        : sha256Hex(acc + step.hash);
  }
  return acc === expectedRoot;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function iso(d: Date | string): string {
  return (d instanceof Date ? d : new Date(d)).toISOString();
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return 'null';
  const rounded = Math.round(n * 10_000) / 10_000;
  return rounded.toString();
}
