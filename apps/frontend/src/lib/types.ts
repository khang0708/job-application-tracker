export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface CompanyAnalysis {
  overview: string;
  industry: string;
  stage: string;
  techStack: string[];
  culture: string[];
  whyJoin: string[];
}

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  analysis?: CompanyAnalysis | null;
}

export interface Application {
  id: string;
  jobTitle: string;
  status: ApplicationStatus;
  sourceUrl?: string | null;
  appliedAt: string;
  updatedAt: string;
  company: Company;
  jobMatch?: { score: number } | null;
}

export interface JobMatch {
  id: string;
  resumeId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  summary: string | null;
  matchedAt: string;
}

export type KanbanGroups = Record<ApplicationStatus, Application[]>;

export interface ParsedJd {
  id: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniorityLevel: string | null;
  keyRequirements: string[];
  responsibilities: string[];
  benefits: string[];
  salary: string | null;
  workMode: string | null;
  location: string | null;
  yearsOfExperience: string | null;
  parsedAt: string;
}

export interface CoverLetter {
  id: string;
  content: string;
  language: string;
  createdAt: string;
}

export interface Resume {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ApplicationDetail extends Application {
  jobDescription: string;
  notes: string | null;
  resume: Resume | null;
  parsedJd: ParsedJd | null;
  jobMatch: JobMatch | null;
  coverLetters: CoverLetter[];
}
