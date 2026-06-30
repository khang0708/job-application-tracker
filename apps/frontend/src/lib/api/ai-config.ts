import { api } from '@/lib/api';

export interface AiConfig {
  provider: 'gemini' | 'openai' | 'ollama';
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  ollamaBaseUrl: string | null;
  ollamaModel: string | null;
  updatedAt?: string;
}

export async function getAiConfig(): Promise<AiConfig | null> {
  const res = await api.get<AiConfig | null>('/ai-config/me');
  return res.data;
}

export async function saveAiConfig(data: Omit<AiConfig, 'updatedAt'>): Promise<AiConfig> {
  const res = await api.put<AiConfig>('/ai-config/me', data);
  return res.data;
}

export async function testAiConfig(): Promise<{ success: boolean; provider: string; response?: string; error?: string }> {
  const res = await api.post('/ai-config/me/test');
  return res.data;
}
