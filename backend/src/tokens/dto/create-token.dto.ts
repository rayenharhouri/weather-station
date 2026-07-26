import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

class CreateTokenScopeDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  crossTenant?: boolean;
}

export class CreateTokenDto {
  @IsString()
  @Length(3, 200)
  name!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTokenScopeDto)
  scope?: CreateTokenScopeDto;

  @IsOptional()
  @IsIn(['30d', '90d', '365d', 'never'])
  expiry?: '30d' | '90d' | '365d' | 'never';
}
