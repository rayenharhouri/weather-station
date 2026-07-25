import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListAlertsQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsIn(['open', 'acknowledged', 'resolved'])
  status?: 'open' | 'acknowledged' | 'resolved';

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: 'info' | 'warning' | 'critical';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class StreamAlertsQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;
}
