import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const V1_METRICS = [
  'temperature',
  'humidity',
  'pressure',
  'rainfall',
  'light',
  'aqi',
  'battery',
  'rssi',
] as const;
export type V1Metric = (typeof V1_METRICS)[number];

export const V1_INTERVALS = ['raw', '5m', '15m', '1h', '1d'] as const;
export type V1Interval = (typeof V1_INTERVALS)[number];

export class V1ReadingsQueryDto {
  @IsString()
  station!: string;

  @IsIn(V1_METRICS as readonly string[])
  metric!: V1Metric;

  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsDateString()
  until?: string;

  @IsOptional()
  @IsIn(V1_INTERVALS as readonly string[])
  interval?: V1Interval;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
