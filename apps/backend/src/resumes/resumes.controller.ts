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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const storage = diskStorage({
  destination: './uploads/resumes',
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${extname(file.originalname)}`);
  },
});

@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) { }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage }))
  upload(
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
    return this.resumesService.create(req.user.id, dto, file);
  }

  @Get()
  findAll(@Request() req) {
    return this.resumesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.resumesService.findOne(id, req.user.id);
  }

  @Patch(':id/default')
  setDefault(@Request() req, @Param('id') id: string) {
    return this.resumesService.setDefault(id, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.resumesService.remove(id, req.user.id);
  }
}
