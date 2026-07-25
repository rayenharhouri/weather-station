import { IsIn, IsOptional } from 'class-validator';

export const USAGE_RANGES = ['24h', '7d', '30d'] as const;
export type UsageRange = (typeof USAGE_RANGES)[number];

export class UsageQueryDto {
  @IsOptional()
  @IsIn(USAGE_RANGES as readonly string[])
  range?: UsageRange;
}
