import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';

export class EmailEventDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsISO8601()
  receivedAt?: string;
}
