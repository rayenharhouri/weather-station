import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ForecastHorizon } from '../entities/forecast.entity';

export const FORECAST_HORIZONS: ForecastHorizon[] = ['1h', '3h', '6h', '24h'];

export class ForecastQueryDto {
  @IsUUID()
  stationId!: string;

  @IsOptional()
  @IsIn(FORECAST_HORIZONS)
  horizon?: ForecastHorizon;
}
