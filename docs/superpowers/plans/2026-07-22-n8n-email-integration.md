# n8n Email Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let n8n forward raw email content (from a user's Gmail) to the backend, which uses AI to classify the email, match it to a tracked job application, and create a pending status-change suggestion the user reviews and accepts/dismisses in the app.

**Architecture:** New `integrations/n8n` NestJS module exposes a per-user API-key-authenticated webhook (`POST /integrations/n8n/email-event`). It calls a new `AiService.classifyEmail()` method (same prompt-builder + JSON-parse pattern as `parseJobDescription`) to get `{ applicationId, suggestedStatus, confidence, reasoning }`, then stores an `EmailSuggestion` row if confidence ≥ 60. JWT-protected endpoints let the user list/accept/dismiss suggestions and manage their API key. Frontend adds a Suggestions page, a nav badge, and an API-key management card in Settings.

**Tech Stack:** NestJS + TypeORM (existing `ai` module conventions), Next.js App Router + Axios (existing frontend conventions), Jest + ts-jest (net new — no test runner is currently wired up in this repo).

## Global Constraints

- Backend global prefix is `/api` (set in `main.ts`) — all paths below are relative to that prefix.
- `ValidationPipe` is already registered globally — new DTOs are validated automatically, no extra wiring needed.
- TypeORM `synchronize: true` in dev — new entities auto-create tables on backend restart, no migration needed for this plan.
- Follow the existing `AiService` pattern exactly: prompt builder in `ai/prompts/*.prompt.ts`, strip ` ```json ` fences, `JSON.parse`, defensive type-checking on every field (see `parseJobDescription` in `apps/backend/src/ai/ai.service.ts:44-48` and `parseJsonResponse` at `apps/backend/src/ai/ai.service.ts:216-237`).
- `AiService.classifyEmail` must accept an optional `userId` and route through the existing `resolveCompleter(userId)` so it respects each user's configured AI provider — do not create a separate AI client.
- No Jest config exists anywhere in this repo (`apps/backend/package.json` has `"test": "jest"` but no `jest` key, and there are zero `*.spec.ts` files). Task 1 must add it before any other task's tests can run.
- No frontend test runner exists. Frontend tasks are verified manually via the dev server, per this project's convention for UI work — not by writing automated tests.
- Confidence threshold for creating a suggestion is `60` (0–100 scale), matching the design spec.
- Suggestions are stored denormalized (`companyName`, `jobTitle` copied at creation time) — no TypeORM relation/join is used for `EmailSuggestion.applicationId`.

---

### Task 1: Backend Jest test infrastructure

No test runner is wired up yet in this repo. This task adds the standard NestJS Jest config and proves it works with a spec for the existing (untested) `AppController`.

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/app.controller.spec.ts`

**Interfaces:**
- Produces: a working `pnpm --filter=backend test` command that all later tasks' spec files rely on.

- [ ] **Step 1: Add Jest config to `apps/backend/package.json`**

Add this top-level key (sibling to `"scripts"`, `"dependencies"`, etc.):

```json
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
```

- [ ] **Step 2: Write a spec for the existing `AppController`**

```typescript
// apps/backend/src/app.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get(AppController);
  });

  it('returns an ok health status', () => {
    const result = controller.health();
    expect(result.status).toBe('ok');
  });
});
```

- [ ] **Step 3: Run it**

Run: `pnpm --filter=backend test`
Expected: `PASS src/app.controller.spec.ts`, 1 test passed.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/package.json apps/backend/src/app.controller.spec.ts
git commit -m "test: add jest configuration and first backend spec"
```

---

### Task 2: `EmailSuggestion` and `UserN8nConfig` entities

**Files:**
- Create: `apps/backend/src/integrations/n8n/email-suggestion.entity.ts`
- Create: `apps/backend/src/integrations/n8n/user-n8n-config.entity.ts`

**Interfaces:**
- Consumes: `ApplicationStatus` enum from `apps/backend/src/applications/application-status.enum.ts`.
- Produces: `EmailSuggestion` entity + `EmailSuggestionResolution` enum (`PENDING` | `ACCEPTED` | `DISMISSED`), and `UserN8nConfig` entity — both consumed by Tasks 3 and 6.

- [ ] **Step 1: Create the `EmailSuggestion` entity**

```typescript
// apps/backend/src/integrations/n8n/email-suggestion.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApplicationStatus } from '../../applications/application-status.enum';

export enum EmailSuggestionResolution {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
}

@Entity('email_suggestions')
export class EmailSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  applicationId: string;

  @Column()
  companyName: string;

  @Column()
  jobTitle: string;

  @Column({ type: 'varchar' })
  suggestedStatus: ApplicationStatus;

  @Column({ type: 'varchar' })
  currentStatusSnapshot: ApplicationStatus;

  @Column({ type: 'int' })
  confidence: number;

  @Column({ type: 'text' })
  reasoning: string;

  @Column()
  emailFrom: string;

  @Column()
  emailSubject: string;

  @Column({ type: 'varchar', default: EmailSuggestionResolution.PENDING })
  resolutionStatus: EmailSuggestionResolution;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;
}
```

- [ ] **Step 2: Create the `UserN8nConfig` entity**

```typescript
// apps/backend/src/integrations/n8n/user-n8n-config.entity.ts
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
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --filter=backend build`
Expected: build succeeds with no TypeScript errors (there's no module wiring these into `TypeOrmModule` yet, but they must type-check standalone).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/integrations/n8n/email-suggestion.entity.ts apps/backend/src/integrations/n8n/user-n8n-config.entity.ts
git commit -m "feat: add EmailSuggestion and UserN8nConfig entities"
```

---

### Task 3: `N8nConfigService` — API key generation and lookup

**Files:**
- Create: `apps/backend/src/integrations/n8n/n8n-config.service.ts`
- Test: `apps/backend/src/integrations/n8n/n8n-config.service.spec.ts`

**Interfaces:**
- Consumes: `UserN8nConfig` entity (Task 2).
- Produces:
  - `regenerate(userId: string): Promise<{ apiKey: string; apiKeyPrefix: string }>` — consumed by Task 7's controller.
  - `getConfig(userId: string): Promise<{ configured: boolean; apiKeyPrefix: string | null }>` — consumed by Task 7's controller.
  - `resolveUserIdByApiKey(apiKey: string): Promise<string | null>` — consumed by Task 4's guard.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/integrations/n8n/n8n-config.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { N8nConfigService } from './n8n-config.service';
import { UserN8nConfig } from './user-n8n-config.entity';

describe('N8nConfigService', () => {
  let service: N8nConfigService;
  let repo: jest.Mocked<Repository<UserN8nConfig>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        N8nConfigService,
        {
          provide: getRepositoryToken(UserN8nConfig),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve({ id: 'config-1', ...data })),
          },
        },
      ],
    }).compile();

    service = module.get(N8nConfigService);
    repo = module.get(getRepositoryToken(UserN8nConfig));
  });

  it('generates a new api key and resolves it back to the same user', async () => {
    repo.findOne.mockResolvedValueOnce(null); // no existing config for this user yet
    const { apiKey } = await service.regenerate('user-1');

    const savedRow = (repo.save as jest.Mock).mock.calls[0][0];
    repo.findOne.mockResolvedValueOnce({ userId: 'user-1', apiKeyHash: savedRow.apiKeyHash } as UserN8nConfig);

    const resolvedUserId = await service.resolveUserIdByApiKey(apiKey);
    expect(resolvedUserId).toBe('user-1');
  });

  it('returns null for an api key that does not exist', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const resolvedUserId = await service.resolveUserIdByApiKey('not-a-real-key');
    expect(resolvedUserId).toBeNull();
  });

  it('reports configured: false when the user has no config yet', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const config = await service.getConfig('user-1');
    expect(config).toEqual({ configured: false, apiKeyPrefix: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=backend test -- src/integrations/n8n/n8n-config.service.spec.ts`
Expected: FAIL — `Cannot find module './n8n-config.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/backend/src/integrations/n8n/n8n-config.service.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=backend test -- src/integrations/n8n/n8n-config.service.spec.ts`
Expected: PASS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/integrations/n8n/n8n-config.service.ts apps/backend/src/integrations/n8n/n8n-config.service.spec.ts
git commit -m "feat: add N8nConfigService for per-user webhook API keys"
```

---

### Task 4: `N8nApiKeyGuard`

**Files:**
- Create: `apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.ts`
- Test: `apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.spec.ts`

**Interfaces:**
- Consumes: `N8nConfigService.resolveUserIdByApiKey(apiKey: string): Promise<string | null>` (Task 3).
- Produces: `N8nApiKeyGuard` (implements `CanActivate`) — attaches `req.n8nUserId: string` on success. Consumed by Task 7's controller on the webhook route.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.spec.ts
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { N8nApiKeyGuard } from './n8n-api-key.guard';
import { N8nConfigService } from '../n8n-config.service';

function buildContext(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('N8nApiKeyGuard', () => {
  let guard: N8nApiKeyGuard;
  let configService: { resolveUserIdByApiKey: jest.Mock };

  beforeEach(() => {
    configService = { resolveUserIdByApiKey: jest.fn() };
    guard = new N8nApiKeyGuard(configService as unknown as N8nConfigService);
  });

  it('allows the request and attaches n8nUserId when the key is valid', async () => {
    configService.resolveUserIdByApiKey.mockResolvedValueOnce('user-1');
    const req: any = { headers: { authorization: 'Bearer valid-key' } };

    const result = await guard.canActivate(buildContext(req));

    expect(result).toBe(true);
    expect(req.n8nUserId).toBe('user-1');
  });

  it('throws UnauthorizedException when the header is missing', async () => {
    const req = { headers: {} };
    await expect(guard.canActivate(buildContext(req))).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the key does not resolve to a user', async () => {
    configService.resolveUserIdByApiKey.mockResolvedValueOnce(null);
    const req = { headers: { authorization: 'Bearer bad-key' } };
    await expect(guard.canActivate(buildContext(req))).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=backend test -- src/integrations/n8n/guards/n8n-api-key.guard.spec.ts`
Expected: FAIL — `Cannot find module './n8n-api-key.guard'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { N8nConfigService } from '../n8n-config.service';

@Injectable()
export class N8nApiKeyGuard implements CanActivate {
  constructor(private readonly n8nConfigService: N8nConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] as string | undefined;
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!apiKey) throw new UnauthorizedException();

    const userId = await this.n8nConfigService.resolveUserIdByApiKey(apiKey);
    if (!userId) throw new UnauthorizedException();

    req.n8nUserId = userId;
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=backend test -- src/integrations/n8n/guards/n8n-api-key.guard.spec.ts`
Expected: PASS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.ts apps/backend/src/integrations/n8n/guards/n8n-api-key.guard.spec.ts
git commit -m "feat: add N8nApiKeyGuard for webhook authentication"
```

---

### Task 5: `AiService.classifyEmail`

**Files:**
- Create: `apps/backend/src/ai/prompts/email-classification.prompt.ts`
- Modify: `apps/backend/src/ai/ai.service.ts`
- Test: `apps/backend/src/ai/ai.service.spec.ts`

**Interfaces:**
- Consumes: `ApplicationStatus` enum from `apps/backend/src/applications/application-status.enum.ts`; existing `AiService.resolveCompleter(userId?)` (private, already implemented).
- Produces:
  ```typescript
  interface ClassifyEmailParams {
    emailFrom: string;
    emailSubject: string;
    emailBody: string;
    applications: { id: string; companyName: string; jobTitle: string; status: string }[];
  }
  interface ClassifyEmailResult {
    applicationId: string | null;
    suggestedStatus: ApplicationStatus | null;
    confidence: number;
    reasoning: string;
  }
  ```
  `AiService.classifyEmail(params: ClassifyEmailParams, userId?: string): Promise<ClassifyEmailResult>` — consumed by Task 6's `EmailSuggestionsService`.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/ai/ai.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenaiProvider } from './providers/openai.provider';
import { UserAiConfigService } from './user-ai-config.service';

describe('AiService.classifyEmail', () => {
  let service: AiService;
  let geminiProvider: { complete: jest.Mock };

  beforeEach(async () => {
    geminiProvider = { complete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: GeminiProvider, useValue: geminiProvider },
        { provide: OpenaiProvider, useValue: { complete: jest.fn() } },
        { provide: UserAiConfigService, useValue: { findByUserId: jest.fn().mockResolvedValue(null) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('parses a well-formed classification response', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: 'app-1',
      suggestedStatus: 'INTERVIEW',
      confidence: 85,
      reasoning: 'Email mentions scheduling a technical interview',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'hr@acme.com',
      emailSubject: 'Interview invitation',
      emailBody: 'We would like to schedule an interview...',
      applications: [{ id: 'app-1', companyName: 'Acme', jobTitle: 'Backend Engineer', status: 'APPLIED' }],
    });

    expect(result).toEqual({
      applicationId: 'app-1',
      suggestedStatus: 'INTERVIEW',
      confidence: 85,
      reasoning: 'Email mentions scheduling a technical interview',
    });
  });

  it('returns a null match when the AI is unsure', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: null,
      suggestedStatus: null,
      confidence: 10,
      reasoning: 'Email does not clearly relate to any tracked application',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'newsletter@random.com',
      emailSubject: 'Weekly digest',
      emailBody: 'Check out these jobs...',
      applications: [],
    });

    expect(result.applicationId).toBeNull();
    expect(result.suggestedStatus).toBeNull();
  });

  it('discards a suggestedStatus value the AI hallucinated', async () => {
    geminiProvider.complete.mockResolvedValueOnce(JSON.stringify({
      applicationId: 'app-1',
      suggestedStatus: 'NOT_A_REAL_STATUS',
      confidence: 90,
      reasoning: 'test',
    }));

    const result = await service.classifyEmail({
      emailFrom: 'hr@acme.com',
      emailSubject: 'Update',
      emailBody: 'body',
      applications: [{ id: 'app-1', companyName: 'Acme', jobTitle: 'Engineer', status: 'APPLIED' }],
    });

    expect(result.suggestedStatus).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=backend test -- src/ai/ai.service.spec.ts`
Expected: FAIL — `service.classifyEmail is not a function`

- [ ] **Step 3: Write the prompt builder**

```typescript
// apps/backend/src/ai/prompts/email-classification.prompt.ts
export interface ClassifyEmailParams {
  emailFrom: string;
  emailSubject: string;
  emailBody: string;
  applications: { id: string; companyName: string; jobTitle: string; status: string }[];
}

export function buildEmailClassificationPrompt(params: ClassifyEmailParams): string {
  const appList = params.applications.length
    ? params.applications
        .map((a) => `- id: ${a.id} | company: ${a.companyName} | jobTitle: ${a.jobTitle} | currentStatus: ${a.status}`)
        .join('\n')
    : '(no tracked applications)';

  return `You are classifying an email that may relate to one of a user's tracked job applications.

Applications currently tracked by this user:
${appList}

Email received:
From: ${params.emailFrom}
Subject: ${params.emailSubject}
Body:
"""
${params.emailBody}
"""

Return ONLY a valid JSON object, no markdown, no preamble, matching this exact shape:
{
  "applicationId": "string — the id from the list above this email most likely relates to, or null if there is no confident match",
  "suggestedStatus": "string — one of APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN implied by this email, or null if unclear",
  "confidence": number — 0-100, your confidence in both the applicationId match and the suggestedStatus,
  "reasoning": "string — one short sentence explaining the decision"
}

Rules:
- If the email doesn't clearly relate to any application in the list, or the status implied is ambiguous, use null for applicationId and/or suggestedStatus and give a low confidence score.
- Never invent an applicationId that isn't in the list above.
- Do not include any text outside the JSON object.`;
}
```

- [ ] **Step 4: Add `classifyEmail` to `AiService`**

In `apps/backend/src/ai/ai.service.ts`, add the import alongside the other prompt imports (near line 12):

```typescript
import { buildEmailClassificationPrompt, ClassifyEmailParams } from './prompts/email-classification.prompt';
import { ApplicationStatus } from '../applications/application-status.enum';
```

Add this exported interface near the top of the file, alongside `ParsedJdResult` (after line 26):

```typescript
export interface ClassifyEmailResult {
  applicationId: string | null;
  suggestedStatus: ApplicationStatus | null;
  confidence: number;
  reasoning: string;
}
```

Add this method to the `AiService` class, alongside the other public methods (e.g. after `generateCoverLetter`, before `testConnection`):

```typescript
  async classifyEmail(params: ClassifyEmailParams, userId?: string): Promise<ClassifyEmailResult> {
    const complete = await this.resolveCompleter(userId);
    const raw = await complete(buildEmailClassificationPrompt(params));
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new BadGatewayException('AI returned invalid JSON for email classification');
    }
    const p = parsed as Record<string, unknown>;
    const validStatuses = Object.values(ApplicationStatus) as string[];
    const suggestedStatus =
      typeof p.suggestedStatus === 'string' && validStatuses.includes(p.suggestedStatus)
        ? (p.suggestedStatus as ApplicationStatus)
        : null;
    return {
      applicationId: typeof p.applicationId === 'string' ? p.applicationId : null,
      suggestedStatus,
      confidence: typeof p.confidence === 'number' ? Math.min(100, Math.max(0, Math.round(p.confidence))) : 0,
      reasoning: typeof p.reasoning === 'string' ? p.reasoning : '',
    };
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter=backend test -- src/ai/ai.service.spec.ts`
Expected: PASS, 3 tests passed.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/ai/prompts/email-classification.prompt.ts apps/backend/src/ai/ai.service.ts apps/backend/src/ai/ai.service.spec.ts
git commit -m "feat: add AiService.classifyEmail for email-to-application matching"
```

---

### Task 6: `EmailSuggestionsService`

**Files:**
- Create: `apps/backend/src/integrations/n8n/email-suggestions.service.ts`
- Test: `apps/backend/src/integrations/n8n/email-suggestions.service.spec.ts`

**Interfaces:**
- Consumes:
  - `EmailSuggestion`, `EmailSuggestionResolution` (Task 2)
  - `AiService.classifyEmail(params, userId?): Promise<ClassifyEmailResult>` (Task 5)
  - `ApplicationsService.findAll(userId: string, status?: ApplicationStatus): Promise<JobApplication[]>` (existing, `apps/backend/src/applications/applications.service.ts:59`) — each `JobApplication` has `.id`, `.jobTitle`, `.status`, `.company.name` (eager-loaded).
  - `ApplicationsService.updateStatus(id: string, userId: string, dto: UpdateStatusDto): Promise<JobApplication>` (existing, `apps/backend/src/applications/applications.service.ts:89`)
- Produces:
  - `handleEmailEvent(userId: string, dto: { from: string; subject: string; body: string }): Promise<{ matched: boolean; suggestionId?: string }>` — consumed by Task 7's controller.
  - `listPending(userId: string): Promise<EmailSuggestion[]>` — consumed by Task 7's controller.
  - `accept(id: string, userId: string): Promise<EmailSuggestion>` — consumed by Task 7's controller.
  - `dismiss(id: string, userId: string): Promise<EmailSuggestion>` — consumed by Task 7's controller.

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/integrations/n8n/email-suggestions.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EmailSuggestionsService } from './email-suggestions.service';
import { EmailSuggestion, EmailSuggestionResolution } from './email-suggestion.entity';
import { ApplicationsService } from '../../applications/applications.service';
import { AiService } from '../../ai/ai.service';
import { ApplicationStatus } from '../../applications/application-status.enum';

describe('EmailSuggestionsService', () => {
  let service: EmailSuggestionsService;
  let repo: any;
  let applicationsService: { findAll: jest.Mock; updateStatus: jest.Mock };
  let aiService: { classifyEmail: jest.Mock };

  const activeApp = {
    id: 'app-1',
    jobTitle: 'Backend Engineer',
    status: ApplicationStatus.APPLIED,
    company: { name: 'Acme' },
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'suggestion-1', ...data })),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    applicationsService = { findAll: jest.fn().mockResolvedValue([activeApp]), updateStatus: jest.fn() };
    aiService = { classifyEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailSuggestionsService,
        { provide: getRepositoryToken(EmailSuggestion), useValue: repo },
        { provide: ApplicationsService, useValue: applicationsService },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get(EmailSuggestionsService);
  });

  describe('handleEmailEvent', () => {
    it('creates a suggestion when the AI confidently matches an application', async () => {
      aiService.classifyEmail.mockResolvedValueOnce({
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        confidence: 85,
        reasoning: 'Interview scheduled',
      });

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: "Let's schedule a call",
      });

      expect(result.matched).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          applicationId: 'app-1',
          suggestedStatus: ApplicationStatus.INTERVIEW,
          resolutionStatus: EmailSuggestionResolution.PENDING,
        }),
      );
    });

    it('does not create a suggestion when confidence is below the threshold', async () => {
      aiService.classifyEmail.mockResolvedValueOnce({
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        confidence: 40,
        reasoning: 'Unsure',
      });

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: 'body',
      });

      expect(result.matched).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('swallows AI errors and reports no match instead of throwing', async () => {
      aiService.classifyEmail.mockRejectedValueOnce(new Error('rate limited'));

      const result = await service.handleEmailEvent('user-1', {
        from: 'hr@acme.com',
        subject: 'Interview',
        body: 'body',
      });

      expect(result.matched).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('accept', () => {
    it('updates the application status and marks the suggestion accepted', async () => {
      const suggestion = {
        id: 'suggestion-1',
        userId: 'user-1',
        applicationId: 'app-1',
        suggestedStatus: ApplicationStatus.INTERVIEW,
        resolutionStatus: EmailSuggestionResolution.PENDING,
      };
      repo.findOne.mockResolvedValueOnce(suggestion);

      await service.accept('suggestion-1', 'user-1');

      expect(applicationsService.updateStatus).toHaveBeenCalledWith('app-1', 'user-1', {
        status: ApplicationStatus.INTERVIEW,
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ resolutionStatus: EmailSuggestionResolution.ACCEPTED }),
      );
    });

    it('throws ForbiddenException when the suggestion belongs to another user', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 'suggestion-1', userId: 'other-user' });
      await expect(service.accept('suggestion-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the suggestion does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);
      await expect(service.accept('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter=backend test -- src/integrations/n8n/email-suggestions.service.spec.ts`
Expected: FAIL — `Cannot find module './email-suggestions.service'`

- [ ] **Step 3: Write the implementation**

```typescript
// apps/backend/src/integrations/n8n/email-suggestions.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailSuggestion, EmailSuggestionResolution } from './email-suggestion.entity';
import { ApplicationsService } from '../../applications/applications.service';
import { AiService } from '../../ai/ai.service';
import { ApplicationStatus } from '../../applications/application-status.enum';

const CONFIDENCE_THRESHOLD = 60;

export interface EmailEventInput {
  from: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailSuggestionsService {
  constructor(
    @InjectRepository(EmailSuggestion)
    private readonly repo: Repository<EmailSuggestion>,
    private readonly applicationsService: ApplicationsService,
    private readonly aiService: AiService,
  ) {}

  async handleEmailEvent(
    userId: string,
    dto: EmailEventInput,
  ): Promise<{ matched: boolean; suggestionId?: string }> {
    const allApps = await this.applicationsService.findAll(userId);
    const activeApps = allApps.filter(
      (a) => a.status !== ApplicationStatus.REJECTED && a.status !== ApplicationStatus.WITHDRAWN,
    );
    if (activeApps.length === 0) return { matched: false };

    let classification;
    try {
      classification = await this.aiService.classifyEmail(
        {
          emailFrom: dto.from,
          emailSubject: dto.subject,
          emailBody: dto.body,
          applications: activeApps.map((a) => ({
            id: a.id,
            companyName: a.company.name,
            jobTitle: a.jobTitle,
            status: a.status,
          })),
        },
        userId,
      );
    } catch {
      return { matched: false };
    }

    if (
      !classification.applicationId ||
      !classification.suggestedStatus ||
      classification.confidence < CONFIDENCE_THRESHOLD
    ) {
      return { matched: false };
    }

    const matchedApp = activeApps.find((a) => a.id === classification.applicationId);
    if (!matchedApp) return { matched: false };

    const suggestion = this.repo.create({
      userId,
      applicationId: matchedApp.id,
      companyName: matchedApp.company.name,
      jobTitle: matchedApp.jobTitle,
      suggestedStatus: classification.suggestedStatus,
      currentStatusSnapshot: matchedApp.status,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      emailFrom: dto.from,
      emailSubject: dto.subject,
      resolutionStatus: EmailSuggestionResolution.PENDING,
    });
    const saved = await this.repo.save(suggestion);
    return { matched: true, suggestionId: saved.id };
  }

  listPending(userId: string): Promise<EmailSuggestion[]> {
    return this.repo.find({
      where: { userId, resolutionStatus: EmailSuggestionResolution.PENDING },
      order: { createdAt: 'DESC' },
    });
  }

  async accept(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.findOwned(id, userId);
    await this.applicationsService.updateStatus(suggestion.applicationId, userId, {
      status: suggestion.suggestedStatus,
    });
    suggestion.resolutionStatus = EmailSuggestionResolution.ACCEPTED;
    suggestion.resolvedAt = new Date();
    return this.repo.save(suggestion);
  }

  async dismiss(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.findOwned(id, userId);
    suggestion.resolutionStatus = EmailSuggestionResolution.DISMISSED;
    suggestion.resolvedAt = new Date();
    return this.repo.save(suggestion);
  }

  private async findOwned(id: string, userId: string): Promise<EmailSuggestion> {
    const suggestion = await this.repo.findOne({ where: { id } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    if (suggestion.userId !== userId) throw new ForbiddenException();
    return suggestion;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter=backend test -- src/integrations/n8n/email-suggestions.service.spec.ts`
Expected: PASS, 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/integrations/n8n/email-suggestions.service.ts apps/backend/src/integrations/n8n/email-suggestions.service.spec.ts
git commit -m "feat: add EmailSuggestionsService to classify and track email suggestions"
```

---

### Task 7: DTO, controller, module wiring

Wires everything from Tasks 2–6 into HTTP endpoints and registers the module. This task has no new unit tests (the logic underneath is already covered) — it's verified by starting the real app and hitting the endpoints with `curl`.

**Files:**
- Create: `apps/backend/src/integrations/n8n/dto/email-event.dto.ts`
- Create: `apps/backend/src/integrations/n8n/n8n.controller.ts`
- Create: `apps/backend/src/integrations/n8n/n8n.module.ts`
- Modify: `apps/backend/src/applications/applications.module.ts` (export `ApplicationsService`)
- Modify: `apps/backend/src/app.module.ts` (register `N8nModule`)

**Interfaces:**
- Consumes: `N8nConfigService` (Task 3), `N8nApiKeyGuard` (Task 4), `EmailSuggestionsService` (Task 6), `JwtAuthGuard` (existing, `apps/backend/src/auth/guards/jwt-auth.guard.ts`).
- Produces: the six HTTP endpoints under `/api/integrations/n8n/*` listed in the design spec — consumed by Tasks 9–11's frontend API client.

- [ ] **Step 1: Create the webhook payload DTO**

```typescript
// apps/backend/src/integrations/n8n/dto/email-event.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsISO8601 } from 'class-validator';

export class EmailEventDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsISO8601()
  receivedAt?: string;
}
```

- [ ] **Step 2: Export `ApplicationsService` from `ApplicationsModule`**

In `apps/backend/src/applications/applications.module.ts`, change:

```typescript
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
```

to:

```typescript
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
```

- [ ] **Step 3: Create the controller**

```typescript
// apps/backend/src/integrations/n8n/n8n.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { N8nApiKeyGuard } from './guards/n8n-api-key.guard';
import { N8nConfigService } from './n8n-config.service';
import { EmailSuggestionsService } from './email-suggestions.service';
import { EmailEventDto } from './dto/email-event.dto';

@ApiTags('n8n-integration')
@Controller('integrations/n8n')
export class N8nController {
  constructor(
    private readonly n8nConfigService: N8nConfigService,
    private readonly emailSuggestionsService: EmailSuggestionsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('config/regenerate')
  regenerate(@Request() req) {
    return this.n8nConfigService.regenerate(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('config')
  getConfig(@Request() req) {
    return this.n8nConfigService.getConfig(req.user.id);
  }

  @UseGuards(N8nApiKeyGuard)
  @Post('email-event')
  handleEmailEvent(@Request() req, @Body() dto: EmailEventDto) {
    return this.emailSuggestionsService.handleEmailEvent(req.n8nUserId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('suggestions')
  listSuggestions(@Request() req) {
    return this.emailSuggestionsService.listPending(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('suggestions/:id/accept')
  accept(@Request() req, @Param('id') id: string) {
    return this.emailSuggestionsService.accept(id, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('suggestions/:id/dismiss')
  dismiss(@Request() req, @Param('id') id: string) {
    return this.emailSuggestionsService.dismiss(id, req.user.id);
  }
}
```

- [ ] **Step 4: Create the module**

```typescript
// apps/backend/src/integrations/n8n/n8n.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSuggestion } from './email-suggestion.entity';
import { UserN8nConfig } from './user-n8n-config.entity';
import { N8nConfigService } from './n8n-config.service';
import { EmailSuggestionsService } from './email-suggestions.service';
import { N8nApiKeyGuard } from './guards/n8n-api-key.guard';
import { N8nController } from './n8n.controller';
import { ApplicationsModule } from '../../applications/applications.module';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailSuggestion, UserN8nConfig]),
    ApplicationsModule,
    AiModule,
  ],
  controllers: [N8nController],
  providers: [N8nConfigService, EmailSuggestionsService, N8nApiKeyGuard],
})
export class N8nModule {}
```

- [ ] **Step 5: Register `N8nModule` in `AppModule`**

In `apps/backend/src/app.module.ts`, add the import:

```typescript
import { N8nModule } from './integrations/n8n/n8n.module';
```

and add `N8nModule` to the `imports` array (after `ChatModule`):

```typescript
    UsersModule,
    AuthModule,
    ResumesModule,
    CompaniesModule,
    ApplicationsModule,
    AiModule,
    ChatModule,
    N8nModule,
  ],
```

- [ ] **Step 6: Run the full backend test suite**

Run: `pnpm --filter=backend test`
Expected: all specs from Tasks 1, 3, 4, 5, 6 pass (11 tests total across 5 spec files).

- [ ] **Step 7: Manually verify the wiring end-to-end**

Requires the DB running and an AI provider configured (either `GEMINI_API_KEY` in `apps/backend/.env`, or a per-user config saved via the existing `/ai-config/me` endpoint).

```bash
pnpm db:up
pnpm --filter=backend dev
```

In another terminal, log in with an existing account and create at least one application via the UI first (or `POST /api/applications`) so there's something to match against. Then:

```bash
# 1. Get a JWT
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | jq -r .token)

# 2. Generate an n8n API key
API_KEY=$(curl -s -X POST http://localhost:4000/api/integrations/n8n/config/regenerate \
  -H "Authorization: Bearer $TOKEN" | jq -r .apiKey)

# 3. Simulate n8n forwarding an email that should match your test application
curl -s -X POST http://localhost:4000/api/integrations/n8n/email-event \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"hr@example.com","subject":"Interview invitation","body":"We would like to schedule a technical interview for the role you applied to."}'
# Expected: { "matched": true, "suggestionId": "..." } if it matches your test application

# 4. List pending suggestions
curl -s http://localhost:4000/api/integrations/n8n/suggestions -H "Authorization: Bearer $TOKEN"

# 5. Accept it
curl -s -X POST http://localhost:4000/api/integrations/n8n/suggestions/<suggestionId>/accept \
  -H "Authorization: Bearer $TOKEN"
# Expected: application's status is now updated — verify on the Kanban board
```

Expected: `email-event` with a bogus API key returns `401`; with the real key it returns `{ matched: true, ... }` when the email content clearly matches your test application's context.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/integrations/n8n/dto/email-event.dto.ts apps/backend/src/integrations/n8n/n8n.controller.ts apps/backend/src/integrations/n8n/n8n.module.ts apps/backend/src/applications/applications.module.ts apps/backend/src/app.module.ts
git commit -m "feat: wire up n8n integration endpoints"
```

---

### Task 8: Frontend types and API client

**Files:**
- Modify: `apps/frontend/src/lib/types.ts`
- Create: `apps/frontend/src/lib/api/n8n.ts`

**Interfaces:**
- Consumes: `/api/integrations/n8n/*` endpoints (Task 7).
- Produces: `EmailSuggestion` type and API functions — consumed by Tasks 9 and 10.

- [ ] **Step 1: Add the `EmailSuggestion` type**

In `apps/frontend/src/lib/types.ts`, append at the end of the file:

```typescript
export interface EmailSuggestion {
  id: string;
  applicationId: string;
  companyName: string;
  jobTitle: string;
  suggestedStatus: ApplicationStatus;
  currentStatusSnapshot: ApplicationStatus;
  confidence: number;
  reasoning: string;
  emailFrom: string;
  emailSubject: string;
  resolutionStatus: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  createdAt: string;
}

export interface N8nConfig {
  configured: boolean;
  apiKeyPrefix: string | null;
}
```

- [ ] **Step 2: Create the API client**

```typescript
// apps/frontend/src/lib/api/n8n.ts
import { api } from '@/lib/api';
import type { EmailSuggestion, N8nConfig } from '@/lib/types';

export async function getN8nConfig(): Promise<N8nConfig> {
  const res = await api.get<N8nConfig>('/integrations/n8n/config');
  return res.data;
}

export async function regenerateN8nApiKey(): Promise<{ apiKey: string; apiKeyPrefix: string }> {
  const res = await api.post<{ apiKey: string; apiKeyPrefix: string }>('/integrations/n8n/config/regenerate');
  return res.data;
}

export async function getPendingSuggestions(): Promise<EmailSuggestion[]> {
  const res = await api.get<EmailSuggestion[]>('/integrations/n8n/suggestions');
  return res.data;
}

export async function acceptSuggestion(id: string): Promise<void> {
  await api.post(`/integrations/n8n/suggestions/${id}/accept`);
}

export async function dismissSuggestion(id: string): Promise<void> {
  await api.post(`/integrations/n8n/suggestions/${id}/dismiss`);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --filter=frontend build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/lib/types.ts apps/frontend/src/lib/api/n8n.ts
git commit -m "feat: add frontend types and API client for n8n integration"
```

---

### Task 9: Suggestions page

**Files:**
- Create: `apps/frontend/src/app/dashboard/suggestions/page.tsx`

**Interfaces:**
- Consumes: `getPendingSuggestions`, `acceptSuggestion`, `dismissSuggestion` (Task 8); `DashboardShell` (existing, `apps/frontend/src/components/layout/DashboardShell.tsx`).

- [ ] **Step 1: Create the page**

```tsx
// apps/frontend/src/app/dashboard/suggestions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getPendingSuggestions, acceptSuggestion, dismissSuggestion } from '@/lib/api/n8n';
import type { EmailSuggestion } from '@/lib/types';

export default function SuggestionsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getPendingSuggestions().then(setSuggestions).finally(() => setIsLoading(false));
  }, [token, router]);

  async function handleAccept(id: string) {
    setBusyId(id);
    try {
      await acceptSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Đã cập nhật trạng thái application');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể áp dụng đề xuất');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      await dismissSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể bỏ qua đề xuất');
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) return <DashboardShell><div className="p-8 text-gray-400 text-sm">Đang tải…</div></DashboardShell>;

  return (
    <DashboardShell>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Đề xuất từ Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI phát hiện các email liên quan đến application của bạn — xác nhận trước khi áp dụng.
          </p>
        </div>

        {suggestions.length === 0 && (
          <div className="glass-light rounded-2xl p-6 text-sm text-gray-500">
            Không có đề xuất nào đang chờ xử lý.
          </div>
        )}

        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.id} className="glass-light rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.companyName} — {s.jobTitle}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Từ: {s.emailFrom} · "{s.emailSubject}"</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Đề xuất chuyển: <span className="font-medium">{s.currentStatusSnapshot}</span> → <span className="font-medium text-blue-600">{s.suggestedStatus}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{s.reasoning} (độ tin cậy: {s.confidence}%)</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAccept(s.id)}
                  disabled={busyId === s.id}
                  className="px-3.5 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => handleDismiss(s.id)}
                  disabled={busyId === s.id}
                  className="px-3.5 py-2 border border-gray-200 text-gray-700 text-xs font-medium rounded-xl hover:bg-white/60 disabled:opacity-50 transition"
                >
                  Bỏ qua
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
```

- [ ] **Step 2: Verify manually in the browser**

```bash
pnpm db:up && pnpm dev
```

Navigate to `http://localhost:3000/dashboard/suggestions` while logged in. If you completed Task 7's manual verification and left a pending suggestion, confirm it renders with correct company/job title/status text, and that clicking "Xác nhận" removes it from the list and updates the application's status on the Kanban board (`/dashboard/applications`). Clicking "Bỏ qua" should also remove it without changing status.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/app/dashboard/suggestions/page.tsx
git commit -m "feat: add Suggestions page for reviewing email-based status suggestions"
```

---

### Task 10: Nav link and pending-count badge

**Files:**
- Modify: `apps/frontend/src/components/layout/DashboardShell.tsx`

**Interfaces:**
- Consumes: `getPendingSuggestions` (Task 8).

- [ ] **Step 1: Add the nav entry and badge**

In `apps/frontend/src/components/layout/DashboardShell.tsx`, update the imports:

```typescript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  User,
  Settings,
  LogOut,
  Zap,
  Inbox,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { getPendingSuggestions } from '@/lib/api/n8n';
```

Add `suggestions` to the `NAV` array (after `applications`):

```typescript
const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/applications', label: 'Applications', icon: Briefcase },
  { href: '/dashboard/suggestions', label: 'Đề xuất', icon: Inbox },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'AI Settings', icon: Settings },
];
```

Inside the `DashboardShell` component, add state and a polling effect (after the existing `const { user, logout } = useAuthStore();` line):

```typescript
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    function refresh() {
      getPendingSuggestions().then((list) => setPendingCount(list.length)).catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);
```

Update the nav rendering to show the badge on the suggestions link (replace the existing `{NAV.map(...)}` block):

```tsx
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            const showBadge = href === '/dashboard/suggestions' && pendingCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-blue-600/90 text-white font-medium shadow-sm shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="bg-amber-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
```

- [ ] **Step 2: Verify manually in the browser**

```bash
pnpm dev
```

With a pending suggestion left over from Task 9's verification, confirm the amber badge with the correct count appears next to "Đề xuất" in the sidebar on every dashboard page, and disappears once all suggestions are accepted/dismissed (allow up to 30s for the poll, or refresh the page).

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/layout/DashboardShell.tsx
git commit -m "feat: add pending suggestions nav badge to dashboard sidebar"
```

---

### Task 11: Settings page — API key management

**Files:**
- Modify: `apps/frontend/src/app/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `getN8nConfig`, `regenerateN8nApiKey` (Task 8).

- [ ] **Step 1: Add n8n config state and loading**

In `apps/frontend/src/app/dashboard/settings/page.tsx`, add to the imports:

```typescript
import { getN8nConfig, regenerateN8nApiKey } from '@/lib/api/n8n';
import type { N8nConfig } from '@/lib/types';
```

Add state inside `SettingsPage`, alongside the existing `useState` calls:

```typescript
  const [n8nConfig, setN8nConfig] = useState<N8nConfig | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
```

Load the config in the existing `useEffect` — change:

```typescript
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getAiConfig().then((config) => {
      if (config) {
        setValue('provider', config.provider);
        setValue('geminiApiKey', config.geminiApiKey ?? '');
        setValue('openaiApiKey', config.openaiApiKey ?? '');
        setValue('ollamaBaseUrl', config.ollamaBaseUrl ?? 'http://localhost:11434');
        setValue('ollamaModel', config.ollamaModel ?? 'llama3.2');
      }
    }).finally(() => setIsLoading(false));
  }, [token, router, setValue]);
```

to:

```typescript
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    getAiConfig().then((config) => {
      if (config) {
        setValue('provider', config.provider);
        setValue('geminiApiKey', config.geminiApiKey ?? '');
        setValue('openaiApiKey', config.openaiApiKey ?? '');
        setValue('ollamaBaseUrl', config.ollamaBaseUrl ?? 'http://localhost:11434');
        setValue('ollamaModel', config.ollamaModel ?? 'llama3.2');
      }
    }).finally(() => setIsLoading(false));
    getN8nConfig().then(setN8nConfig);
  }, [token, router, setValue]);
```

- [ ] **Step 2: Add the generate-key handler**

Add this function inside `SettingsPage`, alongside `onSave`/`onTest`:

```typescript
  async function onGenerateApiKey() {
    setIsGeneratingKey(true);
    try {
      const { apiKey, apiKeyPrefix } = await regenerateN8nApiKey();
      setNewApiKey(apiKey);
      setN8nConfig({ configured: true, apiKeyPrefix });
      toast.success('Đã tạo API key mới');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể tạo API key');
    } finally {
      setIsGeneratingKey(false);
    }
  }
```

- [ ] **Step 3: Add the Integrations card to the page**

Insert this block right before the closing `</div>` of the `<form>` (i.e. after the "Test result" block and before the buttons `div`, or as a new section after `</form>` — place it after `</form>` so it's independent of the AI-config form):

```tsx
        <div className="glass-light rounded-2xl p-5 mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">n8n Integration</h2>
          <p className="text-xs text-gray-500">
            Dùng API key này trong n8n workflow (HTTP Request node, header <code className="font-mono bg-white/60 px-1 rounded">Authorization: Bearer &lt;key&gt;</code>) để gửi email đến:
          </p>
          <code className="block text-xs font-mono bg-white/60 p-2 rounded-xl break-all">
            {(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api')}/integrations/n8n/email-event
          </code>

          {newApiKey ? (
            <div className="p-3 bg-amber-50/80 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-700 font-medium mb-1">Lưu lại ngay — key này chỉ hiển thị một lần:</p>
              <code className="block text-xs font-mono bg-white/70 p-2 rounded-lg break-all select-all">{newApiKey}</code>
            </div>
          ) : n8nConfig?.configured ? (
            <p className="text-xs text-gray-500">Đã cấu hình — key hiện tại: <span className="font-mono">{n8nConfig.apiKeyPrefix}…</span></p>
          ) : (
            <p className="text-xs text-gray-500">Chưa cấu hình API key.</p>
          )}

          <button
            type="button"
            onClick={onGenerateApiKey}
            disabled={isGeneratingKey}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-white/60 disabled:opacity-50 transition"
          >
            {isGeneratingKey ? 'Đang tạo…' : n8nConfig?.configured ? 'Tạo lại API Key' : 'Tạo API Key'}
          </button>
        </div>
```

- [ ] **Step 4: Verify manually in the browser**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/dashboard/settings`. Click "Tạo API Key", confirm the full key is shown once with the "lưu lại ngay" warning, and that reloading the page shows "Đã cấu hình" with only the prefix (never the full key again). Confirm clicking again generates a different key and invalidates the old one (a webhook call using the old key should now return `401`).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/dashboard/settings/page.tsx
git commit -m "feat: add n8n API key management to settings page"
```

---

## Self-Review Notes

- **Spec coverage:** architecture flow (Tasks 5–7), data model (Task 2), API endpoints (Task 7), frontend suggestions UI (Task 9), nav badge (Task 10), settings/API key UI (Task 11), n8n workflow documentation (embedded in Task 11's webhook URL card and the design spec), error handling for bad/missing key (Task 4 tests + Task 7 manual verification), AI-error swallowing and confidence threshold (Task 6 tests) — all covered.
- **Type consistency checked:** `EmailSuggestion.resolutionStatus` uses `EmailSuggestionResolution` enum backend-side and the equivalent string union frontend-side; `handleEmailEvent`/`accept`/`dismiss`/`listPending` signatures match between Task 6's implementation and Task 7's controller calls; `ApplicationsService.findAll`/`updateStatus` signatures match their existing implementations exactly (verified against `apps/backend/src/applications/applications.service.ts`).
- **No placeholders:** every step has complete, runnable code — no "similar to Task N" or "add validation" left unfilled.
