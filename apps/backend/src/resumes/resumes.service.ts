import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { Resume } from './resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { extractTextFromFile } from './resumes.parser';
import { extractPdfTextWithOcr } from './pdf-ocr';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(Resume)
    private resumesRepository: Repository<Resume>,
    private aiService: AiService,
  ) {}

  async create(
    userId: string,
    dto: CreateResumeDto,
    file: Express.Multer.File,
  ): Promise<Resume> {
    const fileBuffer = fs.readFileSync(file.path);

    const isGoodText = (t: string) =>
      t.length >= 100 && (t.match(/[a-zA-ZÀ-ÿ0-9]/g) ?? []).length / t.length >= 0.3;

    let extractedText = await extractTextFromFile(fileBuffer, file.mimetype).catch(() => '');

    // Fallback for custom-font / image PDFs: local OCR via tesseract
    if (!isGoodText(extractedText) && file.mimetype === 'application/pdf') {
      const ocrText = await extractPdfTextWithOcr(fileBuffer).catch(() => '');
      if (ocrText) extractedText = ocrText;
    }

    if (!isGoodText(extractedText)) {
      throw new BadRequestException(
        'Không thể đọc nội dung CV — file này dùng font tùy chỉnh hoặc là ảnh scan. Hãy upload lại dưới dạng DOCX hoặc PDF có text thật (copy được).',
      );
    }

    // Normalize to clean Markdown for better AI parsing downstream
    extractedText = await this.aiService.normalizeCvText(extractedText, userId).catch(() => extractedText);

    const hasExisting = await this.resumesRepository.existsBy({ userId });

    const resume = this.resumesRepository.create({
      userId,
      label: dto.label,
      fileUrl: file.path,
      extractedText,
      isDefault: !hasExisting,
    });

    return this.resumesRepository.save(resume);
  }

  findAll(userId: string): Promise<Resume[]> {
    return this.resumesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'label', 'fileUrl', 'isDefault', 'createdAt'],
    });
  }

  async findOne(id: string, userId: string): Promise<Resume> {
    const resume = await this.resumesRepository.findOne({ where: { id } });
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException();
    return resume;
  }

  async setDefault(id: string, userId: string): Promise<Resume> {
    const resume = await this.findOne(id, userId);
    await this.resumesRepository.update({ userId }, { isDefault: false });
    resume.isDefault = true;
    return this.resumesRepository.save(resume);
  }

  async remove(id: string, userId: string): Promise<void> {
    const resume = await this.findOne(id, userId);

    if (fs.existsSync(resume.fileUrl)) {
      fs.unlinkSync(resume.fileUrl);
    }

    await this.resumesRepository.delete(id);

    // if deleted resume was default, promote the newest remaining one
    if (resume.isDefault) {
      const next = await this.resumesRepository.findOne({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      if (next) {
        next.isDefault = true;
        await this.resumesRepository.save(next);
      }
    }
  }
}
