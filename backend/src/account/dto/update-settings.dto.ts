import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class OpsNotificationPrefsDto {
  @IsOptional() @IsBoolean() alertsEmail?: boolean;
  @IsOptional() @IsBoolean() dailyReport?: boolean;
  @IsOptional() @IsBoolean() weeklyReport?: boolean;
}

class ThresholdsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-50)
  @Max(80)
  tempCriticalC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  humidityWarnPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(800)
  @Max(1100)
  pressureLowHpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  rainfallHourlyMm?: number;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OpsNotificationPrefsDto)
  notifications?: OpsNotificationPrefsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThresholdsDto)
  thresholds?: ThresholdsDto;
}
