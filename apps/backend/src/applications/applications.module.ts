import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './job-application.entity';
import { ParsedJobDescription } from './parsed-job-description.entity';
import { CoverLetter } from './cover-letter.entity';
import { JobMatch } from './job-match.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { CompaniesModule } from '../companies/companies.module';
import { AiModule } from '../ai/ai.module';
import { ResumesModule } from '../resumes/resumes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, ParsedJobDescription, CoverLetter, JobMatch]),
    CompaniesModule,
    AiModule,
    ResumesModule,
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
