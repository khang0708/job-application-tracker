import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export interface CompanyAnalysis {
  overview: string;
  industry: string;
  stage: string;
  techStack: string[];
  culture: string[];
  whyJoin: string[];
}

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  website: string | null;

  @Column({ nullable: true })
  notes: string | null;

  @Column({ nullable: true })
  domain: string | null;

  @Column({ type: 'jsonb', nullable: true })
  analysis: CompanyAnalysis | null;

  @CreateDateColumn()
  createdAt: Date;
}
