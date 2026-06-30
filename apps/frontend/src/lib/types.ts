export type ApplicationStatus =
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface Company {
  id: string;
  name: string;
}

export interface Application {
  id: string;
  jobTitle: string;
  status: ApplicationStatus;
  sourceUrl?: string | null;
  appliedAt: string;
  updatedAt: string;
  company: Company;
}

export type KanbanGroups = Record<ApplicationStatus, Application[]>;

export interface ParsedJd {
  id: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniorityLevel: string | null;
  keyRequirements: string[];
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
  coverLetters: CoverLetter[];
}
