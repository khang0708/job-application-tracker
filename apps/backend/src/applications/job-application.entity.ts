import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Company } from '../companies/company.entity';
import { Resume } from '../resumes/resume.entity';
import { ApplicationStatus } from './application-status.enum';
import { ParsedJobDescription } from './parsed-job-description.entity';
import { CoverLetter } from './cover-letter.entity';

@Entity('job_applications')
@Index(['userId', 'status'])
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  companyId: string;

  @ManyToOne(() => Company, { eager: true })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ nullable: true })
  resumeId: string | null;

  @ManyToOne(() => Resume, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resumeId' })
  resume: Resume | null;

  @Column()
  jobTitle: string;

  @Column({ type: 'text' })
  jobDescription: string;

  @Column({ nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'varchar', default: ApplicationStatus.APPLIED })
  status: ApplicationStatus;

  @CreateDateColumn()
  appliedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => ParsedJobDescription, (p) => p.application, { nullable: true })
  parsedJd: ParsedJobDescription | null;

  @OneToMany(() => CoverLetter, (cl) => cl.application)
  coverLetters: CoverLetter[];
}
