import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailSuggestion, EmailSuggestionResolution } from './email-suggestion.entity';
import { ApplicationsService } from '../../applications/applications.service';
import { AiService } from '../../ai/ai.service';
import { ApplicationStatus } from '../../applications/application-status.enum';

const CONFIDENCE_THRESHOLD = 60;

export interface EmailEventInput {
  from: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailSuggestionsService {
  constructor(
    @InjectRepository(EmailSuggestion)
    private readonly repo: Repository<EmailSuggestion>,
    private readonly applicationsService: ApplicationsService,
    private readonly aiService: AiService,
  ) {}

  async handleEmailEvent(
    userId: string,
    dto: EmailEventInput,
  ): Promise<{ matched: boolean; suggestionId?: string }> {
    try {
      const allApps = await this.applicationsService.findAll(userId);
      const activeApps = allApps.filter(
        (a) => a.status !== ApplicationStatus.REJECTED && a.status !== ApplicationStatus.WITHDRAWN,
      );
      if (activeApps.length === 0) return { matched: false };

      const classification = await this.aiService.classifyEmail(
        {
          emailFrom: dto.from,
          emailSubject: dto.subject,
          emailBody: dto.body,
          applications: activeApps.map((a) => ({
            id: a.id,
            companyName: a.company.name,
            jobTitle: a.jobTitle,
            status: a.status,
          })),
        },
        userId,
      );

      if (
        !classification.applicationId ||
        !classification.suggestedStatus ||
        classification.confidence < CONFIDENCE_THRESHOLD
      ) {
        return { matched: false };
      }

      const matchedApp = activeApps.find((a) => a.id === classification.applicationId);
      if (!matchedApp) return { matched: false };

      const suggestion = this.repo.create({
        userId,
        applicationId: matchedApp.id,
        companyName: matchedApp.company.name,
        jobTitle: matchedApp.jobTitle,
        suggestedStatus: classification.suggestedStatus,
        currentStatusSnapshot: matchedApp.status,
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        emailFrom: dto.from,
        emailSubject: dto.subject,
        resolutionStatus: EmailSuggestionResolution.PENDING,
      });
      const saved = await this.repo.save(suggestion);
      return { matched: true, suggestionId: saved.id };
    } catch {
      return { matched: false };
    }
  }

  listPending(userId: string): Promise<EmailSuggestion[]> {
    return this.repo.find({
      where: { userId, resolutionStatus: EmailSuggestionResolution.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async accept(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.findOwned(id, userId);
    await this.applicationsService.updateStatus(suggestion.applicationId, userId, {
      status: suggestion.suggestedStatus,
    });
    suggestion.resolutionStatus = EmailSuggestionResolution.ACCEPTED;
    suggestion.resolvedAt = new Date();
    return this.repo.save(suggestion);
  }

  async dismiss(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.findOwned(id, userId);
    suggestion.resolutionStatus = EmailSuggestionResolution.DISMISSED;
    suggestion.resolvedAt = new Date();
    return this.repo.save(suggestion);
  }

  private async findOwned(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    if (suggestion.userId !== userId) throw new ForbiddenException();
    return suggestion;
  }
}
