import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resume } from './resume.entity';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Resume]), AiModule, StorageModule],
  providers: [ResumesService],
  controllers: [ResumesController],
  exports: [ResumesService],
})
export class ResumesModule {}
