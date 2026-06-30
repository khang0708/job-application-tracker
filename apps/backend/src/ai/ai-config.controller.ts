import { Body, Controller, Get, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserAiConfigService } from './user-ai-config.service';
import { AiService } from './ai.service';
import { UpsertAiConfigDto } from './dto/upsert-ai-config.dto';

@ApiTags('ai-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-config')
export class AiConfigController {
  constructor(
    private readonly userAiConfigService: UserAiConfigService,
    private readonly aiService: AiService,
  ) {}

  @Get('me')
  getMyConfig(@Request() req) {
    return this.userAiConfigService.findByUserId(req.user.id);
  }

  @Put('me')
  upsertMyConfig(@Request() req, @Body() dto: UpsertAiConfigDto) {
    return this.userAiConfigService.upsert(req.user.id, dto);
  }

  @Post('me/test')
  async testMyConfig(@Request() req) {
    return this.aiService.testConnection(req.user.id);
  }
}
