import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_ai_configs')
export class UserAiConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: 'gemini' })
  provider: string; // 'gemini' | 'openai' | 'anthropic' | 'ollama'

  @Column({ nullable: true, type: 'text' })
  geminiApiKey: string | null;

  @Column({ nullable: true, type: 'text' })
  openaiApiKey: string | null;

  @Column({ nullable: true, type: 'text' })
  anthropicApiKey: string | null;

  @Column({ nullable: true, default: 'claude-haiku-4-5' })
  anthropicModel: string | null;

  @Column({ nullable: true, default: 'http://localhost:11434' })
  ollamaBaseUrl: string | null;

  @Column({ nullable: true, default: 'llama3.2' })
  ollamaModel: string | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
