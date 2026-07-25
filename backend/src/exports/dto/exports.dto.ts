import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ExportFormat } from '../entities/export-job.entity';

const FORMATS: ExportFormat[] = ['csv', 'json', 'parquet'];

export class CreateExportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(32)
  metric!: string;

  @IsOptional()
  @IsUUID()
  station_id?: string;

  @IsString()
  @MaxLength(200)
  station_name!: string;

  @IsDateString()
  window_start!: string;

  @IsDateString()
  window_end!: string;

  @IsIn(FORMATS)
  format!: ExportFormat;
}
