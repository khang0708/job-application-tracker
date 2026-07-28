import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnthropicToUserAiConfig1785252157300 implements MigrationInterface {
    name = 'AddAnthropicToUserAiConfig1785252157300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_ai_configs" ADD COLUMN IF NOT EXISTS "anthropicApiKey" text`);
        await queryRunner.query(`ALTER TABLE "user_ai_configs" ADD COLUMN IF NOT EXISTS "anthropicModel" character varying DEFAULT 'claude-haiku-4-5'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_ai_configs" DROP COLUMN IF EXISTS "anthropicModel"`);
        await queryRunner.query(`ALTER TABLE "user_ai_configs" DROP COLUMN IF EXISTS "anthropicApiKey"`);
    }

}
