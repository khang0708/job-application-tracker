import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '../../applications/application-status.enum';

export enum EmailSuggestionResolution {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
}

@Entity('email_suggestions')
export class EmailSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  applicationId: string;

  @Column()
  companyName: string;

  @Column()
  jobTitle: string;

  @Column({ type: 'varchar' })
  suggestedStatus: ApplicationStatus;

  @Column({ type: 'varchar' })
  currentStatusSnapshot: ApplicationStatus;

  @Column({ type: 'int' })
  confidence: number;

  @Column({ type: 'text' })
  reasoning: string;

  @Column()
  emailFrom: string;

  @Column()
  emailSubject: string;

  @Column({ type: 'varchar', default: EmailSuggestionResolution.PENDING })
  resolutionStatus: EmailSuggestionResolution;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
