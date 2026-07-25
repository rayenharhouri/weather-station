import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RequestGrantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  target_tenant!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  scope!: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
