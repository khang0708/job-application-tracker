import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { JobApplication } from './job-application.entity';

@Entity('parsed_job_descriptions')
export class ParsedJobDescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  applicationId: string;

  @OneToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: JobApplication;

  @Column({ type: 'text', array: true, default: '{}' })
  requiredSkills: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  niceToHaveSkills: string[];

  @Column({ nullable: true })
  seniorityLevel: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  keyRequirements: string[];

  @CreateDateColumn()
  parsedAt: Date;
}
