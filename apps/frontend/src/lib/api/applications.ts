import { api } from '../api';
import type { Application, ApplicationStatus, ApplicationDetail, Company, JobMatch, KanbanGroups } from '../types';

export async function getKanbanGroups(): Promise<KanbanGroups> {
  const res = await api.get<KanbanGroups>('/applications/kanban');
  return res.data;
}

export async function createApplication(data: {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  sourceUrl?: string;
}): Promise<Application> {
  const res = await api.post<Application>('/applications', data);
  return res.data;
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
): Promise<void> {
  await api.patch(`/applications/${id}/status`, { status });
}

export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`);
}

export async function getApplicationDetail(id: string): Promise<ApplicationDetail> {
  const res = await api.get<ApplicationDetail>(`/applications/${id}`);
  return res.data;
}

export async function parseJd(id: string): Promise<ApplicationDetail['parsedJd']> {
  const res = await api.post(`/applications/${id}/parse-jd`);
  return res.data;
}

export async function translateJd(id: string): Promise<{ keyRequirements: string[]; responsibilities: string[]; benefits: string[] }> {
  const res = await api.post(`/applications/${id}/translate-jd`);
  return res.data;
}

export async function matchCv(id: string, resumeId: string): Promise<JobMatch> {
  const res = await api.post<JobMatch>(`/applications/${id}/match-cv`, { resumeId });
  return res.data;
}

export async function updateApplication(
  id: string,
  data: { jobTitle?: string; companyName?: string; jobDescription?: string; sourceUrl?: string | null; notes?: string | null },
): Promise<void> {
  await api.patch(`/applications/${id}`, data);
}

export async function updateApplicationNotes(id: string, notes: string): Promise<void> {
  await api.patch(`/applications/${id}`, { notes });
}

export async function analyzeCompany(id: string): Promise<Company> {
  const res = await api.post<Company>(`/applications/${id}/analyze-company`);
  return res.data;
}

export async function generateCoverLetter(
  id: string,
  params: { resumeId: string; language?: 'en' | 'vi'; maxLength?: number },
): Promise<{ id: string; content: string; language: string; createdAt: string }> {
  const res = await api.post(`/applications/${id}/cover-letter`, params);
  return res.data;
}
