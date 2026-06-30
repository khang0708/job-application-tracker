import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { UserAiConfigService } from './user-ai-config.service';
import { buildJdParsingPrompt, ParseJdParams } from './prompts/jd-parsing.prompt';
import { buildCoverLetterPrompt, GenerateCoverLetterParams } from './prompts/cover-letter.prompt';

export interface ParsedJdResult {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniorityLevel: string | null;
  keyRequirements: string[];
}

type Completer = (prompt: string) => Promise<string>;

@Injectable()
export class AiService {
  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenaiProvider,
    private readonly userAiConfigService: UserAiConfigService,
    private readonly configService: ConfigService,
  ) {}

  async parseJobDescription(params: ParseJdParams, userId?: string): Promise<ParsedJdResult> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildJdParsingPrompt(params));
    return this.parseJsonResponse(raw);
  }

  async generateCoverLetter(params: GenerateCoverLetterParams, userId?: string): Promise<string> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildCoverLetterPrompt(params));
    return raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  async testConnection(userId: string): Promise<{ success: boolean; provider: string; response?: string; error?: string }> {
    const config = await this.userAiConfigService.findByUserId(userId);
    const provider = config?.provider ?? this.configService.get('AI_PROVIDER', 'gemini');
    try {
      const complete = await this.resolveCompleter(userId);
      const response = await complete('Respond with exactly the word PONG and nothing else.');
      return { success: true, provider, response: response.trim() };
    } catch (err: any) {
      return { success: false, provider, error: err?.message ?? 'Unknown error' };
    }
  }

  private async resolveCompleter(userId?: string): Promise<Completer> {
    if (!userId) {
      return (p) => this.getDefaultProvider().complete(p);
    }

    const config = await this.userAiConfigService.findByUserId(userId);
    if (!config) {
      return (p) => this.getDefaultProvider().complete(p);
    }

    switch (config.provider) {
      case 'openai': {
        const apiKey = config.openaiApiKey || this.configService.get<string>('OPENAI_API_KEY') || '';
        if (!apiKey) throw new BadRequestException('OpenAI API key is not configured');
        const client = new OpenAI({ apiKey });
        return async (p) => {
          const res = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: p }],
          });
          return res.choices[0]?.message?.content ?? '';
        };
      }

      case 'ollama': {
        const baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
        const model = config.ollamaModel || 'llama3.2';
        return (p) => this.callOllama(p, baseUrl, model);
      }

      case 'gemini':
      default: {
        const apiKey = config.geminiApiKey || this.configService.get<string>('GEMINI_API_KEY') || '';
        if (!apiKey) throw new BadRequestException('Gemini API key is not configured');
        const client = new GoogleGenAI({ apiKey });
        return async (p) => {
          const res = await client.models.generateContent({ model: 'gemini-2.0-flash', contents: p });
          return res.text ?? '';
        };
      }
    }
  }

  private async callOllama(prompt: string, baseUrl: string, model: string): Promise<string> {
    const url = `${baseUrl.replace(/\/$/, '')}/api/generate`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!res.ok) {
      throw new BadGatewayException(`Ollama error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { response?: string };
    return data.response ?? '';
  }

  private getDefaultProvider(): GeminiProvider | OpenaiProvider {
    return this.configService.get('AI_PROVIDER') === 'openai'
      ? this.openaiProvider
      : this.geminiProvider;
  }

  private parseJsonResponse(raw: string): ParsedJdResult {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException('AI returned invalid JSON for JD parsing');
    }
    const p = parsed as Record<string, unknown>;
    return {
      requiredSkills: Array.isArray(p.requiredSkills) ? (p.requiredSkills as string[]) : [],
      niceToHaveSkills: Array.isArray(p.niceToHaveSkills) ? (p.niceToHaveSkills as string[]) : [],
      seniorityLevel: typeof p.seniorityLevel === 'string' ? p.seniorityLevel : null,
      keyRequirements: Array.isArray(p.keyRequirements) ? (p.keyRequirements as string[]) : [],
    };
  }
}
