import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResumeDto {
  @ApiProperty({ example: 'English CV - Senior Fullstack' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;
}
