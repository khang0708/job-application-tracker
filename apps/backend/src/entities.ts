import { UserAiConfig } from './ai/user-ai-config.entity';
import { CoverLetter } from './applications/cover-letter.entity';
import { JobApplication } from './applications/job-application.entity';
import { JobMatch } from './applications/job-match.entity';
import { ParsedJobDescription } from './applications/parsed-job-description.entity';
import { Company } from './companies/company.entity';
import { EmailSuggestion } from './integrations/n8n/email-suggestion.entity';
import { UserN8nConfig } from './integrations/n8n/user-n8n-config.entity';
import { Resume } from './resumes/resume.entity';
import { User } from './users/user.entity';

export const entities = [
  UserAiConfig,
  CoverLetter,
  JobApplication,
  JobMatch,
  ParsedJobDescription,
  Company,
  EmailSuggestion,
  UserN8nConfig,
  Resume,
  User,
];
