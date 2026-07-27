import { Test, TestingModule } from '@nestjs/testing';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { Resume } from './resume.entity';

describe('ResumesController', () => {
  let controller: ResumesController;
  let service: {
    findOne: jest.Mock;
    create: jest.Mock;
    setDefault: jest.Mock;
    findAll: jest.Mock;
    remove: jest.Mock;
  };

  const resumeWithFileUrl: Resume = {
    id: 'resume-1',
    userId: 'user-1',
    user: undefined,
    label: 'Main CV',
    fileUrl: 'https://blob.example/abc-resume.pdf',
    extractedText: 'some text',
    isDefault: true,
    createdAt: new Date(),
  } as Resume;

  beforeEach(async () => {
    service = {
      findOne: jest.fn().mockResolvedValue(resumeWithFileUrl),
      create: jest.fn().mockResolvedValue(resumeWithFileUrl),
      setDefault: jest.fn().mockResolvedValue(resumeWithFileUrl),
      findAll: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumesController],
      providers: [{ provide: ResumesService, useValue: service }],
    }).compile();

    controller = module.get(ResumesController);
  });

  it('GET /:id does not return fileUrl', async () => {
    const result = await controller.findOne({ user: { id: 'user-1' } }, 'resume-1');
    expect(result).not.toHaveProperty('fileUrl');
    expect(result).toEqual(expect.objectContaining({ id: 'resume-1', label: 'Main CV' }));
  });

  it('POST /resumes (upload) does not return fileUrl', async () => {
    const result = await controller.upload(
      { user: { id: 'user-1' } },
      { label: 'Main CV' } as any,
      { buffer: Buffer.from('x'), originalname: 'cv.pdf', mimetype: 'application/pdf' } as Express.Multer.File,
    );
    expect(result).not.toHaveProperty('fileUrl');
    expect(result).toEqual(expect.objectContaining({ id: 'resume-1', label: 'Main CV' }));
  });

  it('PATCH /:id/default does not return fileUrl', async () => {
    const result = await controller.setDefault({ user: { id: 'user-1' } }, 'resume-1');
    expect(result).not.toHaveProperty('fileUrl');
    expect(result).toEqual(expect.objectContaining({ id: 'resume-1', label: 'Main CV' }));
  });
});
