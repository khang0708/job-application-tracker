import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { UserAiConfigService } from './user-ai-config.service';
import { buildJdParsingPrompt, ParseJdParams } from './prompts/jd-parsing.prompt';
import { buildJdTranslationPrompt, TranslateJdParams } from './prompts/jd-translation.prompt';
import { buildCvJdMatchPrompt, MatchCvJdParams, MatchCvJdResult } from './prompts/cv-jd-match.prompt';
import { buildCoverLetterPrompt, GenerateCoverLetterParams } from './prompts/cover-letter.prompt';
import { buildCompanyAnalysisPrompt, AnalyzeCompanyParams, CompanyAnalysisAiResult } from './prompts/company-analysis.prompt';
import { buildCvNormalizePrompt } from './prompts/cv-normalize.prompt';

export interface ParsedJdResult {
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

  async complete(prompt: string, userId?: string): Promise<string> {
    const completer = await this.resolveCompleter(userId);
    return completer(prompt);
  }

  async parseJobDescription(params: ParseJdParams, userId?: string): Promise<ParsedJdResult> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildJdParsingPrompt(params));
    return this.parseJsonResponse(raw);
  }

  async translateJd(params: TranslateJdParams, userId?: string): Promise<TranslateJdParams> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildJdTranslationPrompt(params));
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException('AI returned invalid JSON for JD translation');
    }
    const p = parsed as Record<string, unknown>;
    return {
      keyRequirements: Array.isArray(p.keyRequirements) ? (p.keyRequirements as string[]) : params.keyRequirements,
      responsibilities: Array.isArray(p.responsibilities) ? (p.responsibilities as string[]) : params.responsibilities,
      benefits: Array.isArray(p.benefits) ? (p.benefits as string[]) : params.benefits,
    };
  }

  async extractPdfText(buffer: Buffer, userId?: string): Promise<string> {
    const config = userId ? await this.userAiConfigService.findByUserId(userId) : null;
    const apiKey = config?.geminiApiKey || this.configService.get<string>('GEMINI_API_KEY') || '';
    if (!apiKey) return '';

    const client = new GoogleGenAI({ apiKey });
    const res = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          { text: 'Extract all text content from this PDF resume. Return only the raw extracted text, preserving structure (name, contact, skills, experience, education sections). No commentary, no formatting instructions.' },
          { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
        ],
      }],
    });
    return res.text?.trim() ?? '';
  }

  async normalizeCvText(rawText: string, userId?: string): Promise<string> {
    const complete = await this.resolveCompleter(userId);
    const result = await complete(buildCvNormalizePrompt(rawText));
    return result.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  async matchCvJd(params: MatchCvJdParams, userId?: string): Promise<MatchCvJdResult> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildCvJdMatchPrompt(params));
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException('AI returned invalid JSON for CV-JD match');
    }
    const p = parsed as Record<string, unknown>;
    return {
      score: typeof p.score === 'number' ? Math.min(100, Math.max(0, Math.round(p.score))) : 0,
      matchedSkills: Array.isArray(p.matchedSkills) ? (p.matchedSkills as string[]) : [],
      missingSkills: Array.isArray(p.missingSkills) ? (p.missingSkills as string[]) : [],
      strengths: Array.isArray(p.strengths) ? (p.strengths as string[]) : [],
      gaps: Array.isArray(p.gaps) ? (p.gaps as string[]) : [],
      summary: typeof p.summary === 'string' ? p.summary : null,
    };
  }

  async analyzeCompany(params: AnalyzeCompanyParams, userId?: string): Promise<CompanyAnalysisAiResult> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildCompanyAnalysisPrompt(params));
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException('AI returned invalid JSON for company analysis');
    }
    const p = parsed as Record<string, unknown>;
    return {
      domain: typeof p.domain === 'string' ? p.domain : null,
      overview: typeof p.overview === 'string' ? p.overview : '',
      industry: typeof p.industry === 'string' ? p.industry : '',
      stage: typeof p.stage === 'string' ? p.stage : '',
      techStack: Array.isArray(p.techStack) ? (p.techStack as string[]) : [],
      culture: Array.isArray(p.culture) ? (p.culture as string[]) : [],
      whyJoin: Array.isArray(p.whyJoin) ? (p.whyJoin as string[]) : [],
    };
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
      responsibilities: Array.isArray(p.responsibilities) ? (p.responsibilities as string[]) : [],
      benefits: Array.isArray(p.benefits) ? (p.benefits as string[]) : [],
      salary: typeof p.salary === 'string' ? p.salary : null,
      workMode: typeof p.workMode === 'string' ? p.workMode : null,
      location: typeof p.location === 'string' ? p.location : null,
      yearsOfExperience: typeof p.yearsOfExperience === 'string' ? p.yearsOfExperience : null,
    };
  }
}
