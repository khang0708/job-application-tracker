import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { Resume } from './resume.entity';
import { CreateResumeDto } from './dto/create-resume.dto';
import { extractTextFromFile } from './resumes.parser';

@Injectable()
export class ResumesService {
  constructor(
    @InjectRepository(Resume)
    private resumesRepository: Repository<Resume>,
  ) {}

  async create(
    userId: string,
    dto: CreateResumeDto,
    file: Express.Multer.File,
  ): Promise<Resume> {
    // diskStorage doesn't populate file.buffer — read from saved path
    const fileBuffer = fs.readFileSync(file.path);
    const extractedText = await extractTextFromFile(fileBuffer, file.mimetype);

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
