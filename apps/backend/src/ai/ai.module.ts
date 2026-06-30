import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';

@Module({
  providers: [AiService, GeminiProvider, OpenaiProvider],
  exports: [AiService],
})
export class AiModule {}
