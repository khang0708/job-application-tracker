import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpsertAiConfigDto {
  @IsEnum(['gemini', 'openai', 'ollama'])
  provider: string;

  @IsOptional()
  @IsString()
  geminiApiKey?: string | null;

  @IsOptional()
  @IsString()
  openaiApiKey?: string | null;

  @IsOptional()
  @IsString()
  ollamaBaseUrl?: string | null;

  @IsOptional()
  @IsString()
  ollamaModel?: string | null;
}
