import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';

@Entity('job_matches')
export class JobMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @OneToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: JobApplication;

  @Column()
  resumeId: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text', array: true, default: '{}' })
  matchedSkills: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  missingSkills: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  strengths: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  gaps: string[];

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @CreateDateColumn()
  matchedAt: Date;
}
