import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiConfigController } from './ai-config.controller';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { UserAiConfig } from './user-ai-config.entity';
import { UserAiConfigService } from './user-ai-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserAiConfig])],
  controllers: [AiConfigController],
  providers: [AiService, GeminiProvider, OpenaiProvider, UserAiConfigService],
  exports: [AiService],
})
export class AiModule {}
