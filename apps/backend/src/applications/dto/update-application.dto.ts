import { IsString, IsOptional, IsUrl, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateApplicationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'sourceUrl must be a valid URL' })
  sourceUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resumeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string | null;
}
