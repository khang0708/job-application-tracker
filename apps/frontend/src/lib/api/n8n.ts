import { api } from '@/lib/api';
import type { EmailSuggestion, N8nConfig } from '@/lib/types';

export async function getN8nConfig(): Promise<N8nConfig> {
  const res = await api.get<N8nConfig>('/integrations/n8n/config');
  return res.data;
}

export async function regenerateN8nApiKey(): Promise<{ apiKey: string; apiKeyPrefix: string }> {
  const res = await api.post<{ apiKey: string; apiKeyPrefix: string }>('/integrations/n8n/config/regenerate');
  return res.data;
}

export async function getPendingSuggestions(): Promise<EmailSuggestion[]> {
  const res = await api.get<EmailSuggestion[]>('/integrations/n8n/suggestions');
  return res.data;
}

export async function acceptSuggestion(id: string): Promise<void> {
  await api.post(`/integrations/n8n/suggestions/${id}/accept`);
}

export async function dismissSuggestion(id: string): Promise<void> {
  await api.post(`/integrations/n8n/suggestions/${id}/dismiss`);
}
