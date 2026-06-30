import { api } from '../api';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(message: string, history: ChatTurn[]): Promise<string> {
  const res = await api.post<{ reply: string }>('/chat', { message, history });
  return res.data.reply;
}
