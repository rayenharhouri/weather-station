import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export type AggregationInterval = 'raw' | '5m' | '15m' | '1h' | '1d';

export const AGGREGATION_INTERVALS: AggregationInterval[] = [
  'raw',
  '5m',
  '15m',
  '1h',
  '1d',
];

export class HistoryQueryDto {
  @IsUUID()
  stationId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsIn(AGGREGATION_INTERVALS)
  interval?: AggregationInterval;
}

export class LatestQueryDto {
  @IsUUID()
  stationId!: string;
}

export class SummaryQueryDto {
  @IsUUID()
  stationId!: string;

  @IsOptional()
  @IsIn(['24h', '7d', '30d', '90d'])
  range?: '24h' | '7d' | '30d' | '90d';
}

export class StreamQueryDto {
  @IsUUID()
  stationId!: string;
}

export class DeviceStatusQueryDto {
  @IsUUID()
  stationId!: string;
}
