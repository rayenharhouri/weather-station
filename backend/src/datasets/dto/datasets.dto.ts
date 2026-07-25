import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { DatasetFormat, DatasetVisibility } from '../entities/dataset.entity';

const VISIBILITIES: DatasetVisibility[] = ['public', 'private', 'shared'];
const FORMATS: DatasetFormat[] = ['csv', 'json', 'parquet'];

export class ListDatasetsQueryDto {
  @IsOptional()
  @IsIn([...VISIBILITIES, 'all'])
  visibility?: DatasetVisibility | 'all';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}

export class CreateDatasetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(VISIBILITIES)
  visibility!: DatasetVisibility;

  @IsString()
  @MaxLength(32)
  metric!: string;

  @IsString()
  @MaxLength(200)
  station_name!: string;

  @IsOptional()
  @IsUUID()
  station_id?: string;

  @IsDateString()
  window_start!: string;

  @IsDateString()
  window_end!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  record_count!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  size_bytes!: number;

  @IsArray()
  @ArrayUnique()
  @IsIn(FORMATS, { each: true })
  formats!: DatasetFormat[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  citation?: string;

  @IsOptional()
  @IsString()
  playground_href?: string;
}
