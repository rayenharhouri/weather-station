import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class IngestReadingDto {
  @IsUUID()
  stationId!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  temperatureC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  humidityPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pressureHpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rainfallMm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lightLux?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  airQualityValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  batteryVoltage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  signalRssi?: number;
}
