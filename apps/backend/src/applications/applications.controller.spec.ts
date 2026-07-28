import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from './application-status.enum';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: {
    findOne: jest.Mock;
    updateStatus: jest.Mock;
    update: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    findGroupedByStatus: jest.Mock;
    remove: jest.Mock;
    analyzeCompany: jest.Mock;
    parseJd: jest.Mock;
    translateJd: jest.Mock;
    matchCv: jest.Mock;
    generateCoverLetter: jest.Mock;
  };

  const appWithResumeFileUrl = {
    id: 'app-1',
    userId: 'user-1',
    jobTitle: 'Backend Engineer',
    status: ApplicationStatus.APPLIED,
    resume: {
      id: 'resume-1',
      label: 'Main CV',
      fileUrl: 'https://blob.example/abc-resume.pdf',
      extractedText: 'some text',
      isDefault: true,
    },
  };

  beforeEach(async () => {
    service = {
      findOne: jest.fn().mockResolvedValue(appWithResumeFileUrl),
      updateStatus: jest.fn().mockResolvedValue(appWithResumeFileUrl),
      update: jest.fn().mockResolvedValue(appWithResumeFileUrl),
      create: jest.fn(),
      findAll: jest.fn(),
      findGroupedByStatus: jest.fn(),
      remove: jest.fn(),
      analyzeCompany: jest.fn(),
      parseJd: jest.fn(),
      translateJd: jest.fn(),
      matchCv: jest.fn(),
      generateCoverLetter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationsService, useValue: service }],
    }).compile();

    controller = module.get(ApplicationsController);
  });

  it('GET /:id does not return resume.fileUrl', async () => {
    const result = await controller.findOne({ user: { id: 'user-1' } }, 'app-1');
    expect(result.resume).not.toHaveProperty('fileUrl');
    expect(result.resume).toEqual(expect.objectContaining({ id: 'resume-1', label: 'Main CV' }));
  });

  it('PATCH /:id/status does not return resume.fileUrl', async () => {
    const result = await controller.updateStatus(
      { user: { id: 'user-1' } },
      'app-1',
      { status: ApplicationStatus.SCREENING },
    );
    expect(result.resume).not.toHaveProperty('fileUrl');
  });

  it('PATCH /:id does not return resume.fileUrl', async () => {
    const result = await controller.update({ user: { id: 'user-1' } }, 'app-1', {});
    expect(result.resume).not.toHaveProperty('fileUrl');
  });

  it('does not crash when the application has no resume attached', async () => {
    service.findOne.mockResolvedValueOnce({ ...appWithResumeFileUrl, resume: null });
    const result = await controller.findOne({ user: { id: 'user-1' } }, 'app-1');
    expect(result.resume).toBeNull();
  });
});
