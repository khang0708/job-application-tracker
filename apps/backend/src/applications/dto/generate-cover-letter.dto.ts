import { IsUUID, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCoverLetterDto {
  @ApiProperty()
  @IsUUID()
  resumeId: string;

  @ApiPropertyOptional({ enum: ['en', 'vi'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'vi'])
  language?: 'en' | 'vi';

  @ApiPropertyOptional({ description: 'Max character count for platforms with limits' })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  maxLength?: number;
}
