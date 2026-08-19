import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { IsUUID } from 'class-validator';

class MatchCvDto {
  @IsUUID()
  resumeId: string;
}
import { ApplicationStatus } from './application-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobApplication } from './job-application.entity';

const storage = memoryStorage();

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  private omitResumeFileUrl(app: JobApplication): JobApplication {
    if (app.resume) {
      const { fileUrl, ...safeResume } = app.resume;
      return { ...app, resume: safeResume } as JobApplication;
    }
    return app;
  }

  @Post()
  create(@Request() req, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(req.user.id, dto);
  }

  @Post('extract-jd-file')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async extractJdFile(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({
            fileType:
              /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/png)/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const text = await this.applicationsService.extractJdText(file, req.user.id);
    return { text };
  }

  @Get()
  @ApiQuery({ name: 'status', enum: ApplicationStatus, required: false })
  findAll(@Request() req, @Query('status') status?: ApplicationStatus) {
    return this.applicationsService.findAll(req.user.id, status);
  }

  @Get('kanban')
  kanban(@Request() req) {
    return this.applicationsService.findGroupedByStatus(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const app = await this.applicationsService.findOne(id, req.user.id);
    return this.omitResumeFileUrl(app);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const app = await this.applicationsService.updateStatus(id, req.user.id, dto);
    return this.omitResumeFileUrl(app);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    const app = await this.applicationsService.update(id, req.user.id, dto);
    return this.omitResumeFileUrl(app);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.applicationsService.remove(id, req.user.id);
  }

  @Post(':id/analyze-company')
  analyzeCompany(@Request() req, @Param('id') id: string) {
    return this.applicationsService.analyzeCompany(id, req.user.id);
  }

  @Post(':id/parse-jd')
  parseJd(@Request() req, @Param('id') id: string) {
    return this.applicationsService.parseJd(id, req.user.id);
  }

  @Post(':id/translate-jd')
  translateJd(@Request() req, @Param('id') id: string) {
    return this.applicationsService.translateJd(id, req.user.id);
  }

  @Post(':id/match-cv')
  matchCv(@Request() req, @Param('id') id: string, @Body() dto: MatchCvDto) {
    return this.applicationsService.matchCv(id, req.user.id, dto.resumeId);
  }

  @Post(':id/cover-letter')
  generateCoverLetter(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: GenerateCoverLetterDto,
  ) {
    return this.applicationsService.generateCoverLetter(id, req.user.id, dto);
  }
}
