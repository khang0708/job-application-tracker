import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('user_n8n_configs')
export class UserN8nConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ unique: true })
  apiKeyHash: string;

  @Column()
  apiKeyPrefix: string;

  @CreateDateColumn()
  createdAt: Date;
}
