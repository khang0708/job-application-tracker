import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication } from './job-application.entity';
import { ParsedJobDescription } from './parsed-job-description.entity';
import { CoverLetter } from './cover-letter.entity';
import { ApplicationStatus } from './application-status.enum';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { CompaniesService } from '../companies/companies.service';
import { AiService } from '../ai/ai.service';
import { ResumesService } from '../resumes/resumes.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private applicationsRepository: Repository<JobApplication>,
    @InjectRepository(ParsedJobDescription)
    private parsedJdRepository: Repository<ParsedJobDescription>,
    @InjectRepository(CoverLetter)
    private coverLetterRepository: Repository<CoverLetter>,
    private companiesService: CompaniesService,
    private aiService: AiService,
    private resumesService: ResumesService,
  ) {}

  async create(userId: string, dto: CreateApplicationDto): Promise<JobApplication> {
    const company = await this.companiesService.findOrCreate(dto.companyName);
    const application = this.applicationsRepository.create({
      userId,
      companyId: company.id,
      jobTitle: dto.jobTitle,
      jobDescription: dto.jobDescription,
      sourceUrl: dto.sourceUrl ?? null,
      resumeId: dto.resumeId ?? null,
    });
    const saved = await this.applicationsRepository.save(application);
    return this.applicationsRepository.findOne({
      where: { id: saved.id },
      relations: ['company'],
    }) as Promise<JobApplication>;
  }

  findAll(userId: string, status?: ApplicationStatus): Promise<JobApplication[]> {
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    return this.applicationsRepository.find({
      where,
      relations: ['company'],
      order: { appliedAt: 'DESC' },
      select: {
        id: true,
        jobTitle: true,
        status: true,
        sourceUrl: true,
        appliedAt: true,
        updatedAt: true,
        company: { id: true, name: true },
      },
    });
  }

  async findOne(id: string, userId: string): Promise<JobApplication> {
    const app = await this.applicationsRepository.findOne({
      where: { id },
      relations: ['company', 'resume', 'parsedJd', 'coverLetters'],
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.userId !== userId) throw new ForbiddenException();
    return app;
  }

  async updateStatus(id: string, userId: string, dto: UpdateStatusDto): Promise<JobApplication> {
    const app = await this.findOne(id, userId);
    app.status = dto.status;
    return this.applicationsRepository.save(app);
  }

  async update(id: string, userId: string, dto: UpdateApplicationDto): Promise<JobApplication> {
    const app = await this.findOne(id, userId);
    Object.assign(app, dto);
    return this.applicationsRepository.save(app);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.applicationsRepository.delete(id);
  }

  async findGroupedByStatus(userId: string): Promise<Record<ApplicationStatus, JobApplication[]>> {
    const all = await this.applicationsRepository.find({
      where: { userId },
      relations: ['company'],
      order: { appliedAt: 'DESC' },
      select: {
        id: true,
        jobTitle: true,
        status: true,
        sourceUrl: true,
        appliedAt: true,
        updatedAt: true,
        company: { id: true, name: true },
      },
    });
    const grouped = {} as Record<ApplicationStatus, JobApplication[]>;
    for (const s of Object.values(ApplicationStatus)) grouped[s] = [];
    for (const app of all) grouped[app.status].push(app);
    return grouped;
  }

  async parseJd(id: string, userId: string): Promise<ParsedJobDescription> {
    const app = await this.findOne(id, userId);

    const result = await this.aiService.parseJobDescription({
      jobDescriptionText: app.jobDescription,
    }, userId);

    // Upsert: replace if already parsed
    const existing = await this.parsedJdRepository.findOne({
      where: { applicationId: id },
    });
    if (existing) {
      Object.assign(existing, result);
      return this.parsedJdRepository.save(existing);
    }

    const parsedJd = this.parsedJdRepository.create({ applicationId: id, ...result });
    return this.parsedJdRepository.save(parsedJd);
  }

  async generateCoverLetter(
    id: string,
    userId: string,
    dto: GenerateCoverLetterDto,
  ): Promise<CoverLetter> {
    const app = await this.findOne(id, userId);

    const resume = await this.resumesService.findOne(dto.resumeId, userId);
    if (!resume.extractedText) {
      throw new BadRequestException('Resume has no extracted text — please re-upload');
    }

    const content = await this.aiService.generateCoverLetter({
      resumeText: resume.extractedText,
      jobDescriptionText: app.jobDescription,
      parsedJd: app.parsedJd ?? null,
      language: dto.language ?? 'en',
      maxLength: dto.maxLength,
    }, userId);

    const coverLetter = this.coverLetterRepository.create({
      applicationId: id,
      resumeId: dto.resumeId,
      content,
      language: dto.language ?? 'en',
    });
    return this.coverLetterRepository.save(coverLetter);
  }
}
