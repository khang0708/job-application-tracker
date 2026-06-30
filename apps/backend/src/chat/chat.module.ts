import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from '../applications/job-application.entity';
import { AiModule } from '../ai/ai.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobApplication]), AiModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
