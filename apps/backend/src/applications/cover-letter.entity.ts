import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';
import { Resume } from '../resumes/resume.entity';

@Entity('cover_letters')
export class CoverLetter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @ManyToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: JobApplication;

  @Column()
  resumeId: string;

  @ManyToOne(() => Resume, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'en' })
  language: string;

  @CreateDateColumn()
  createdAt: Date;
}
