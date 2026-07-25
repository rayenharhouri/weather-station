import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListBatchesQueryDto {
  @IsOptional()
  @IsUUID()
  stationId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class VerifyRecordDto {
  @IsString()
  @IsNotEmpty()
  recordId!: string;
}

export class VerifyBatchDto {
  @IsUUID()
  batchId!: string;
}
