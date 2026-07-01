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

  @Column({ type: 'text', array: true, default: '{}' })
  responsibilities: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  benefits: string[];

  @Column({ nullable: true })
  salary: string | null;

  @Column({ nullable: true })
  workMode: string | null;

  @Column({ nullable: true })
  location: string | null;

  @Column({ nullable: true })
  yearsOfExperience: string | null;

  @CreateDateColumn()
  parsedAt: Date;
}
