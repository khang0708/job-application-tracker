import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiProvider {
  // Lazy-init: OpenAI SDK throws on construction if API key is missing,
  // so we defer creation until the first actual call.
  private client: OpenAI | null = null;

  constructor(private configService: ConfigService) {}

  async complete(prompt: string): Promise<string> {
    if (!this.client) {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new InternalServerErrorException(
          'OPENAI_API_KEY is not set — cannot use OpenAI provider',
        );
      }
      this.client = new OpenAI({ apiKey });
    }
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
