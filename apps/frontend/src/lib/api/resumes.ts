import { api } from '../api';
import type { Resume } from '../types';

export async function getResumes(): Promise<Resume[]> {
  const res = await api.get<Resume[]>('/resumes');
  return res.data;
}

export async function uploadResume(label: string, file: File): Promise<Resume> {
  const form = new FormData();
  form.append('label', label);
  form.append('file', file);
  const res = await api.post<Resume>('/resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function setDefaultResume(id: string): Promise<Resume> {
  const res = await api.patch<Resume>(`/resumes/${id}/default`);
  return res.data;
}

export async function deleteResume(id: string): Promise<void> {
  await api.delete(`/resumes/${id}`);
}
