import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAiConfig } from './user-ai-config.entity';
import { UpsertAiConfigDto } from './dto/upsert-ai-config.dto';

@Injectable()
export class UserAiConfigService {
  constructor(
    @InjectRepository(UserAiConfig)
    private readonly repo: Repository<UserAiConfig>,
  ) {}

  async findByUserId(userId: string): Promise<UserAiConfig | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async upsert(userId: string, dto: UpsertAiConfigDto): Promise<UserAiConfig> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      Object.assign(existing, dto);
      return this.repo.save(existing);
    }
    const config = this.repo.create({ userId, ...dto });
    return this.repo.save(config);
  }
}
