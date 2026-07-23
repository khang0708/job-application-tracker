import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSuggestion } from './email-suggestion.entity';
import { UserN8nConfig } from './user-n8n-config.entity';
import { N8nConfigService } from './n8n-config.service';
import { EmailSuggestionsService } from './email-suggestions.service';
import { N8nApiKeyGuard } from './guards/n8n-api-key.guard';
import { N8nController } from './n8n.controller';
import { ApplicationsModule } from '../../applications/applications.module';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailSuggestion, UserN8nConfig]),
    ApplicationsModule,
    AiModule,
  ],
  controllers: [N8nController],
  providers: [N8nConfigService, EmailSuggestionsService, N8nApiKeyGuard],
})
export class N8nModule {}
