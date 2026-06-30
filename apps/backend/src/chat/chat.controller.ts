import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendChatDto } from './dto/send-chat.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async send(@Request() req, @Body() dto: SendChatDto) {
    const reply = await this.chatService.chat(
      req.user.id,
      req.user.name,
      dto.message,
      dto.history,
    );
    return { reply };
  }
}
