import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { buildJdParsingPrompt, ParseJdParams } from './prompts/jd-parsing.prompt';
import {
  buildCoverLetterPrompt,
  GenerateCoverLetterParams,
} from './prompts/cover-letter.prompt';

export interface ParsedJdResult {
  requiredSkills: string[];
  niceToHaveSkills: string[];
  seniorityLevel: string | null;
  keyRequirements: string[];
}

@Injectable()
export class AiService {
  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenaiProvider,
    private readonly configService: ConfigService,
  ) {}

  async parseJobDescription(params: ParseJdParams): Promise<ParsedJdResult> {
    const prompt = buildJdParsingPrompt(params);
    const raw = await this.getActiveProvider().complete(prompt);
    return this.parseJsonResponse(raw);
  }

  async generateCoverLetter(params: GenerateCoverLetterParams): Promise<string> {
    const prompt = buildCoverLetterPrompt(params);
    const raw = await this.getActiveProvider().complete(prompt);
    // Strip accidental markdown code fences the model might add despite instructions
    return raw.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  private getActiveProvider(): GeminiProvider | OpenaiProvider {
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
