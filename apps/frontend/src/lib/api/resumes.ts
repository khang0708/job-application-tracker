import { api } from '../api';
import type { Resume } from '../types';

export async function getResumes(): Promise<Resume[]> {
  const res = await api.get<Resume[]>('/resumes');
  return res.data;
}
