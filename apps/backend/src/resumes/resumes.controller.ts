import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Resume } from './resume.entity';

const storage = memoryStorage();

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) { }

  private omitFileUrl(resume: Resume) {
    const { fileUrl, ...safeResume } = resume;
    return safeResume;
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  async upload(
    @Request() req,
    @Body() dto: CreateResumeDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({
            fileType:
              /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const resume = await this.resumesService.create(req.user.id, dto, file);
    return this.omitFileUrl(resume);
  }

  @Get()
  findAll(@Request() req) {
    return this.resumesService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const resume = await this.resumesService.findOne(id, req.user.id);
    return this.omitFileUrl(resume);
  }

  @Patch(':id/default')
  async setDefault(@Request() req, @Param('id') id: string) {
    const resume = await this.resumesService.setDefault(id, req.user.id);
    return this.omitFileUrl(resume);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.resumesService.remove(id, req.user.id);
  }
}
