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
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';
import { ApplicationStatus } from './application-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateApplicationDto) {
    return this.applicationsService.create(req.user.id, dto);
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
  findOne(@Request() req, @Param('id') id: string) {
    return this.applicationsService.findOne(id, req.user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, req.user.id, dto);
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.applicationsService.remove(id, req.user.id);
  }

  @Post(':id/parse-jd')
  parseJd(@Request() req, @Param('id') id: string) {
    return this.applicationsService.parseJd(id, req.user.id);
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
