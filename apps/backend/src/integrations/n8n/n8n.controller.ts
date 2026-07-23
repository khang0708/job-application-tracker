import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { N8nApiKeyGuard } from './guards/n8n-api-key.guard';
import { N8nConfigService } from './n8n-config.service';
import { EmailSuggestionsService } from './email-suggestions.service';
import { EmailEventDto } from './dto/email-event.dto';

@ApiTags('n8n-integration')
@Controller('integrations/n8n')
export class N8nController {
  constructor(
    private readonly n8nConfigService: N8nConfigService,
    private readonly emailSuggestionsService: EmailSuggestionsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('config/regenerate')
  regenerate(@Request() req) {
    return this.n8nConfigService.regenerate(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('config')
  getConfig(@Request() req) {
    return this.n8nConfigService.getConfig(req.user.id);
  }

  @UseGuards(N8nApiKeyGuard)
  @Post('email-event')
  handleEmailEvent(@Request() req, @Body() dto: EmailEventDto) {
    return this.emailSuggestionsService.handleEmailEvent(req.n8nUserId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('suggestions')
  listSuggestions(@Request() req) {
    return this.emailSuggestionsService.listPending(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('suggestions/:id/accept')
  accept(@Request() req, @Param('id') id: string) {
    return this.emailSuggestionsService.accept(id, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('suggestions/:id/dismiss')
  dismiss(@Request() req, @Param('id') id: string) {
    return this.emailSuggestionsService.dismiss(id, req.user.id);
  }
}
