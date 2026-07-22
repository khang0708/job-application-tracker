import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserN8nConfig } from './user-n8n-config.entity';

@Injectable()
export class N8nConfigService {
  constructor(
    @InjectRepository(UserN8nConfig)
    private readonly repo: Repository<UserN8nConfig>,
  ) {}

  async regenerate(userId: string): Promise<{ apiKey: string; apiKeyPrefix: string }> {
    const apiKey = `n8n_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyPrefix = apiKey.slice(0, 12);

    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      existing.apiKeyHash = apiKeyHash;
      existing.apiKeyPrefix = apiKeyPrefix;
      await this.repo.save(existing);
    } else {
      const config = this.repo.create({ userId, apiKeyHash, apiKeyPrefix });
      await this.repo.save(config);
    }

    return { apiKey, apiKeyPrefix };
  }

  async getConfig(userId: string): Promise<{ configured: boolean; apiKeyPrefix: string | null }> {
    const existing = await this.repo.findOne({ where: { userId } });
    return { configured: !!existing, apiKeyPrefix: existing?.apiKeyPrefix ?? null };
  }

  async resolveUserIdByApiKey(apiKey: string): Promise<string | null> {
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const existing = await this.repo.findOne({ where: { apiKeyHash } });
    return existing?.userId ?? null;
  }
}
