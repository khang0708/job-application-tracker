import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { Resume } from './resume.entity';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';

jest.mock('./resumes.parser', () => ({
  extractTextFromFile: jest.fn(),
}));
jest.mock('./pdf-claude-extract', () => ({
  extractPdfTextWithClaude: jest.fn(),
}));

import { extractTextFromFile } from './resumes.parser';
import { extractPdfTextWithClaude } from './pdf-claude-extract';

describe('ResumesService', () => {
  let service: ResumesService;
  let repo: any;
  let storageService: { save: jest.Mock; read: jest.Mock; delete: jest.Mock };
  let aiService: { normalizeCvText: jest.Mock };

  const goodText = 'a'.repeat(150);

  beforeEach(async () => {
    repo = {
      existsBy: jest.fn().mockResolvedValue(false),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'resume-1', ...data })),
      findOne: jest.fn(),
      delete: jest.fn(),
    };
    storageService = {
      save: jest.fn().mockResolvedValue({ url: 'https://blob.example/abc.pdf', key: 'https://blob.example/abc.pdf' }),
      read: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    aiService = { normalizeCvText: jest.fn((text) => Promise.resolve(text)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: getRepositoryToken(Resume), useValue: repo },
        { provide: AiService, useValue: aiService },
        { provide: StorageService, useValue: storageService },
      ],
    }).compile();

    service = module.get(ResumesService);
    jest.clearAllMocks();
    (extractTextFromFile as jest.Mock).mockResolvedValue(goodText);
    aiService.normalizeCvText.mockImplementation((text) => Promise.resolve(text));
  });

  describe('create', () => {
    const file = { buffer: Buffer.from('pdf-bytes'), mimetype: 'application/pdf', originalname: 'resume.pdf' } as Express.Multer.File;

    it('saves the file via StorageService and stores the returned key as fileUrl', async () => {
      await service.create('user-1', { label: 'Main CV' }, file);

      expect(storageService.save).toHaveBeenCalledWith(file.buffer, expect.stringContaining('.pdf'));
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ fileUrl: 'https://blob.example/abc.pdf' }),
      );
    });

    it('falls back to Claude extraction when the parser returns unusable text', async () => {
      (extractTextFromFile as jest.Mock).mockResolvedValue('');
      (extractPdfTextWithClaude as jest.Mock).mockResolvedValue(goodText);

      await service.create('user-1', { label: 'Main CV' }, file);

      expect(extractPdfTextWithClaude).toHaveBeenCalledWith(file.buffer);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ extractedText: goodText }));
    });

    it('throws BadRequestException when neither the parser nor Claude produce usable text', async () => {
      (extractTextFromFile as jest.Mock).mockResolvedValue('');
      (extractPdfTextWithClaude as jest.Mock).mockResolvedValue('');

      await expect(service.create('user-1', { label: 'Main CV' }, file)).rejects.toThrow(BadRequestException);
      expect(storageService.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the file via StorageService before deleting the DB row', async () => {
      repo.findOne.mockResolvedValue({ id: 'resume-1', userId: 'user-1', fileUrl: 'https://blob.example/abc.pdf', isDefault: false });

      await service.remove('resume-1', 'user-1');

      expect(storageService.delete).toHaveBeenCalledWith('https://blob.example/abc.pdf');
      expect(repo.delete).toHaveBeenCalledWith('resume-1');
    });
  });
});
