import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785165332024 implements MigrationInterface {
    name = 'InitialSchema1785165332024'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "resumes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "label" character varying NOT NULL, "fileUrl" character varying NOT NULL, "extractedText" text NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c8677802096d6baece48429d2e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "website" character varying, "notes" character varying, "domain" character varying, "analysis" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cover_letters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicationId" uuid NOT NULL, "resumeId" uuid NOT NULL, "content" text NOT NULL, "language" character varying NOT NULL DEFAULT 'en', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0f231af2e38adfe3a1dc814237d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "job_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicationId" uuid NOT NULL, "resumeId" character varying NOT NULL, "score" integer NOT NULL, "matchedSkills" text array NOT NULL DEFAULT '{}', "missingSkills" text array NOT NULL DEFAULT '{}', "strengths" text array NOT NULL DEFAULT '{}', "gaps" text array NOT NULL DEFAULT '{}', "summary" text, "matchedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_bf6b9efc52c7b02b2863909568" UNIQUE ("applicationId"), CONSTRAINT "PK_ff1cc5ef34826840839cce74198" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "job_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "companyId" uuid NOT NULL, "resumeId" uuid, "jobTitle" character varying NOT NULL, "jobDescription" text NOT NULL, "sourceUrl" character varying, "status" character varying NOT NULL DEFAULT 'APPLIED', "notes" text, "appliedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c56a5e86707d0f0df18fa111280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_631bf17cc637282f046e49fd72" ON "job_applications" ("userId", "status") `);
        await queryRunner.query(`CREATE TABLE "parsed_job_descriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "applicationId" uuid NOT NULL, "requiredSkills" text array NOT NULL DEFAULT '{}', "niceToHaveSkills" text array NOT NULL DEFAULT '{}', "seniorityLevel" character varying, "keyRequirements" text array NOT NULL DEFAULT '{}', "responsibilities" text array NOT NULL DEFAULT '{}', "benefits" text array NOT NULL DEFAULT '{}', "salary" character varying, "workMode" character varying, "location" character varying, "yearsOfExperience" character varying, "parsedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_4a0417223ae537a333c1b6e964" UNIQUE ("applicationId"), CONSTRAINT "PK_5fb737fd0228d9bb9ff3cac7ff3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_ai_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "provider" character varying NOT NULL DEFAULT 'gemini', "geminiApiKey" text, "openaiApiKey" text, "ollamaBaseUrl" character varying DEFAULT 'http://localhost:11434', "ollamaModel" character varying DEFAULT 'llama3.2', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6a61cf92d400dbc1a154e73e310" UNIQUE ("userId"), CONSTRAINT "PK_c02b5449d61004eeba0959e466b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_n8n_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "apiKeyHash" character varying NOT NULL, "apiKeyPrefix" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9e54ae7aea4d4efca96d9a36ba6" UNIQUE ("userId"), CONSTRAINT "UQ_2000712632a9c9b9662b0d5690c" UNIQUE ("apiKeyHash"), CONSTRAINT "PK_b71015105a03223daffc5eed7a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "email_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "applicationId" character varying NOT NULL, "companyName" character varying NOT NULL, "jobTitle" character varying NOT NULL, "suggestedStatus" character varying NOT NULL, "currentStatusSnapshot" character varying NOT NULL, "confidence" integer NOT NULL, "reasoning" text NOT NULL, "emailFrom" character varying NOT NULL, "emailSubject" character varying NOT NULL, "resolutionStatus" character varying NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP, CONSTRAINT "PK_6070fac692a482f2fcc1f0e89a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "resumes" ADD CONSTRAINT "FK_339097f7bb65e85c34f033df05b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_2daf9a6e59461ecd2eacfe4f2ec" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cover_letters" ADD CONSTRAINT "FK_7393b54c183a8b8c9a70a85fdb7" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_matches" ADD CONSTRAINT "FK_bf6b9efc52c7b02b28639095680" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_f5d132e5bfd7d396afb6458e71c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_92408dce394a8401082a0ca482b" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "job_applications" ADD CONSTRAINT "FK_06f643f316f387949e31c101586" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "parsed_job_descriptions" ADD CONSTRAINT "FK_4a0417223ae537a333c1b6e9649" FOREIGN KEY ("applicationId") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "parsed_job_descriptions" DROP CONSTRAINT "FK_4a0417223ae537a333c1b6e9649"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_06f643f316f387949e31c101586"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_92408dce394a8401082a0ca482b"`);
        await queryRunner.query(`ALTER TABLE "job_applications" DROP CONSTRAINT "FK_f5d132e5bfd7d396afb6458e71c"`);
        await queryRunner.query(`ALTER TABLE "job_matches" DROP CONSTRAINT "FK_bf6b9efc52c7b02b28639095680"`);
        await queryRunner.query(`ALTER TABLE "cover_letters" DROP CONSTRAINT "FK_7393b54c183a8b8c9a70a85fdb7"`);
        await queryRunner.query(`ALTER TABLE "cover_letters" DROP CONSTRAINT "FK_2daf9a6e59461ecd2eacfe4f2ec"`);
        await queryRunner.query(`ALTER TABLE "resumes" DROP CONSTRAINT "FK_339097f7bb65e85c34f033df05b"`);
        await queryRunner.query(`DROP TABLE "email_suggestions"`);
        await queryRunner.query(`DROP TABLE "user_n8n_configs"`);
        await queryRunner.query(`DROP TABLE "user_ai_configs"`);
        await queryRunner.query(`DROP TABLE "parsed_job_descriptions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_631bf17cc637282f046e49fd72"`);
        await queryRunner.query(`DROP TABLE "job_applications"`);
        await queryRunner.query(`DROP TABLE "job_matches"`);
        await queryRunner.query(`DROP TABLE "cover_letters"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TABLE "resumes"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
