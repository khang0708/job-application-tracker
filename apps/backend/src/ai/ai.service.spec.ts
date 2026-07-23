import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { UserAiConfigService } from './user-ai-config.service';

describe('AiService.classifyEmail', () => {
  let service: AiService;
  let geminiProvider: { complete: jest.Mock };

  beforeEach(async () => {
    geminiProvider = { complete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: GeminiProvider, useValue: geminiProvider },
        { provide: OpenaiProvider, useValue: { complete: jest.fn() } },
        { provide: UserAiConfigService, useValue: { findByUserId: jest.fn().mockResolvedValue(null) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('parses a well-formed classification response', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: 'app-1',
      suggestedStatus: 'INTERVIEW',
      confidence: 85,
      reasoning: 'Email mentions scheduling a technical interview',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'hr@acme.com',
      emailSubject: 'Interview invitation',
      emailBody: 'We would like to schedule an interview...',
      applications: [{ id: 'app-1', companyName: 'Acme', jobTitle: 'Backend Engineer', status: 'APPLIED' }],
    });

    expect(result).toEqual({
      applicationId: 'app-1',
      suggestedStatus: 'INTERVIEW',
      confidence: 85,
      reasoning: 'Email mentions scheduling a technical interview',
    });
  });

  it('returns a null match when the AI is unsure', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: null,
      suggestedStatus: null,
      confidence: 10,
      reasoning: 'Email does not clearly relate to any tracked application',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'newsletter@random.com',
      emailSubject: 'Weekly digest',
      emailBody: 'Check out these jobs...',
      applications: [],
    });

    expect(result.applicationId).toBeNull();
    expect(result.suggestedStatus).toBeNull();
  });

  it('discards a suggestedStatus value the AI hallucinated', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: 'app-1',
      suggestedStatus: 'NOT_A_REAL_STATUS',
      confidence: 90,
      reasoning: 'test',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'hr@acme.com',
      emailSubject: 'Update',
      emailBody: 'body',
      applications: [{ id: 'app-1', companyName: 'Acme', jobTitle: 'Engineer', status: 'APPLIED' }],
    });

    expect(result.suggestedStatus).toBeNull();
  });

  it('discards an applicationId the AI hallucinated that is not in the candidate list', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: 'app-does-not-exist',
      suggestedStatus: 'INTERVIEW',
      confidence: 90,
      reasoning: 'test',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'hr@acme.com',
      emailSubject: 'Update',
      emailBody: 'body',
      applications: [{ id: 'app-1', companyName: 'Acme', jobTitle: 'Engineer', status: 'APPLIED' }],
    });

    expect(result.applicationId).toBeNull();
  });
});
