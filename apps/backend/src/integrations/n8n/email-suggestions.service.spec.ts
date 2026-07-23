import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EmailSuggestionsService } from './email-suggestions.service';
import { EmailSuggestion, EmailSuggestionResolution } from './email-suggestion.entity';
import { ApplicationsService } from '../../applications/applications.service';
import { AiService } from '../../ai/ai.service';
import { ApplicationStatus } from '../../applications/application-status.enum';

describe('EmailSuggestionsService', () => {
  let service: EmailSuggestionsService;
  let repo: any;
  let applicationsService: { findAll: jest.Mock; updateStatus: jest.Mock };
  let aiService: { classifyEmail: jest.Mock };

  const activeApp = {
    id: 'app-1',
    jobTitle: 'Backend Engineer',
    status: ApplicationStatus.APPLIED,
    company: { name: 'Acme' },
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'suggestion-1', ...data })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    applicationsService = { findAll: jest.fn().mockResolvedValue([activeApp]), updateStatus: jest.fn() };
    aiService = { classifyEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSuggestionsService,
        { provide: getRepositoryToken(EmailSuggestion), useValue: repo },
        { provide: ApplicationsService, useValue: applicationsService },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get(EmailSuggestionsService);
  });

  describe('handleEmailEvent', () => {
    it('creates a suggestion when the AI confidently matches an application', async () => {
      aiService.classifyEmail.mockResolvedValueOnce({
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        confidence: 85,
        reasoning: 'Interview scheduled',
      });

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: "Let's schedule a call",
      });

      expect(result.matched).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          applicationId: 'app-1',
          suggestedStatus: ApplicationStatus.INTERVIEW,
          resolutionStatus: EmailSuggestionResolution.PENDING,
        }),
      );
    });

    it('does not create a suggestion when confidence is below the threshold', async () => {
      aiService.classifyEmail.mockResolvedValueOnce({
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        confidence: 40,
        reasoning: 'Unsure',
      });

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: 'body',
      });

      expect(result.matched).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('swallows AI errors and reports no match instead of throwing', async () => {
      aiService.classifyEmail.mockRejectedValueOnce(new Error('rate limited'));

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: 'body',
      });

      expect(result.matched).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('updates the application status and marks the suggestion accepted', async () => {
      const suggestion = {
        id: 'suggestion-1',
        userId: 'user-1',
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        resolutionStatus: EmailSuggestionResolution.PENDING,
      };
      repo.findOne.mockResolvedValueOnce(suggestion);

      await service.accept('suggestion-1', 'user-1');

      expect(applicationsService.updateStatus).toHaveBeenCalledWith('app-1', 'user-1', {
        status: ApplicationStatus.INTERVIEW,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ resolutionStatus: EmailSuggestionResolution.ACCEPTED }),
      );
    });

    it('throws ForbiddenException when the suggestion belongs to another user', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 'suggestion-1', userId: 'other-user' });
      await expect(service.accept('suggestion-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the suggestion does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.accept('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
