import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CitationFormat } from '../entities/account-preference.entity';

class NotificationPrefsDto {
  @IsOptional() @IsBoolean() weeklyDigest?: boolean;
  @IsOptional() @IsBoolean() rateLimitWarnings?: boolean;
  @IsOptional() @IsBoolean() breakingChanges?: boolean;
  @IsOptional() @IsBoolean() anchorCompletion?: boolean;
  @IsOptional() @IsBoolean() grantUpdates?: boolean;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPrefsDto)
  notifications?: NotificationPrefsDto;

  @IsOptional()
  @IsIn(['apa', 'mla', 'chicago', 'bibtex'])
  citationFormat?: CitationFormat;

  @IsOptional()
  @IsBoolean()
  autoCite?: boolean;

  @IsOptional()
  @IsUUID()
  activeTokenId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orcid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  affiliation?: string;
}
