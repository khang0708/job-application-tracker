# Job Application Tracker

Ứng dụng SaaS quản lý hồ sơ ứng tuyển việc làm, tích hợp AI để trích xuất yêu cầu JD, chấm điểm mức độ phù hợp CV↔JD, phân tích công ty, sinh cover letter, và tự động gợi ý cập nhật trạng thái ứng tuyển từ email (qua n8n). Giao diện chính là Kanban board drag-and-drop theo pipeline: Applied → Screening → Interview → Offer → Rejected. Đã deploy production trên Vercel (backend + frontend là 2 project riêng biệt).

---

## Mục lục

1. [Tính năng](#tính-năng)
2. [Tech Stack & Lý do chọn](#tech-stack--lý-do-chọn)
3. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
4. [Database Schema](#database-schema)
5. [Backend — Giải thích từng module](#backend--giải-thích-từng-module)
6. [Frontend — Giải thích từng phần](#frontend--giải-thích-từng-phần)
7. [Luồng dữ liệu chính](#luồng-dữ-liệu-chính)
8. [API Reference](#api-reference)
9. [Cài đặt & Khởi động](#cài-đặt--khởi-động)
10. [Biến môi trường](#biến-môi-trường)
11. [Triển khai lên Vercel](#triển-khai-lên-vercel)

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Auth** | Đăng ký / đăng nhập bằng email + password, JWT stateless |
| **Resume upload** | Upload CV dạng PDF/DOC/DOCX (max 5MB), tự động trích xuất + chuẩn hóa text để AI dùng; OCR fallback qua Claude khi text extract chất lượng kém |
| **Job Application CRUD** | Thêm / sửa / xóa đơn ứng tuyển |
| **Kanban board** | Drag-and-drop cards giữa các cột trạng thái; optimistic update; có toggle sang Table view |
| **AI — Parse JD** | Phân tích Job Description → trích xuất required/nice-to-have skills, seniority, key requirements, salary, work mode, location |
| **AI — Translate JD** | Dịch key requirements/responsibilities/benefits đã parse sang ngôn ngữ khác |
| **AI — CV-JD Match** | Chấm điểm mức độ phù hợp CV↔JD (0-100), liệt kê matched/missing skills, strengths/gaps |
| **AI — Company Analysis** | Phân tích công ty (overview, industry, stage, tech stack, culture, why-join) — tự thu thập context từ DuckDuckGo + homepage công ty, không dùng search API trả phí |
| **AI — Cover Letter** | Sinh cover letter dựa trên CV + JD đã parse; hỗ trợ EN/VI; editable sau khi sinh |
| **AI — Chat Assistant** | Chat widget hỏi-đáp về danh sách ứng tuyển của chính user (tiếng Việt), có context 40 application gần nhất |
| **Đa provider AI** | Người dùng tự chọn & cấu hình provider trong Settings: Gemini, OpenAI, Anthropic Claude, hoặc Ollama (local) — kèm API key riêng, test connection |
| **n8n — Gợi ý cập nhật trạng thái từ email** | Sinh API key riêng, trỏ workflow n8n theo dõi hộp thư vào webhook → AI phân loại email khớp với application nào, gợi ý status mới → user duyệt/từ chối ở trang Suggestions |
| **Đa CV** | Upload nhiều phiên bản CV, chọn CV nào dùng để sinh cover letter / match JD |
| **Company autocomplete** | Tên công ty được dedup và gợi ý khi nhập |
| **Cloud storage** | File CV lưu local disk (dev) hoặc Vercel Blob (production) tùy `STORAGE_DRIVER` |

---

## Tech Stack & Lý do chọn

### Backend

| Công nghệ | Lý do |
|---|---|
| **NestJS** | Modular monolith, DI container, decorator-based — cấu trúc rõ ràng, dễ scale từng module |
| **TypeORM** | ORM cho PostgreSQL; `synchronize: true` ở dev, migrations bắt buộc + tự chạy ở production |
| **PostgreSQL 16** (Neon ở production) | Hỗ trợ native `TEXT[]` array (skills list), `jsonb` (company analysis), full-text search khi cần |
| **Multer** | File upload middleware tích hợp sẵn với NestJS/Express |
| **pdf-parse + mammoth** | Text extraction từ PDF và DOCX — 2 format phổ biến nhất cho CV |
| **@google/genai** | Gemini 2.0 Flash — provider mặc định, nhanh, rẻ, đủ tốt cho structured extraction + text generation |
| **openai** | Provider thay thế — GPT-4o Mini |
| **@anthropic-ai/sdk** | Provider thay thế — Claude Haiku/Sonnet/Opus (chọn model tùy user); đồng thời dùng riêng làm OCR fallback khi pdf-parse/mammoth trích xuất lỗi (PDF scan/custom font) |
| **@vercel/blob** | Storage driver cho production — serverless không có disk bền vững giữa các lần invoke |
| **JWT (passport-jwt)** | Stateless auth cho hầu hết API; n8n webhook dùng cơ chế API key riêng (không qua JWT) |
| **Swagger** | Auto-generated API docs tại `/api/docs` (chỉ bật ngoài production) |

### Frontend

| Công nghệ | Lý do |
|---|---|
| **Next.js 14 (App Router)** | SSR cho landing/SEO, CSR cho dashboard interactive |
| **Tailwind CSS** | Utility-first, không cần component library cho MVP |
| **@dnd-kit/core** | Kanban drag-and-drop — modern, accessible, không deprecated như `react-beautiful-dnd` |
| **Zustand** | Lightweight global state cho auth (token + user) |
| **React Hook Form + Zod** | Form validation với TypeScript inference từ schema |
| **Sonner** | Toast notifications — minimal, đẹp, tích hợp tốt với App Router |
| **Axios** | HTTP client có interceptors — tự động đính JWT vào header, redirect về `/login` khi 401 |

### Infrastructure

| Công nghệ | Lý do |
|---|---|
| **pnpm workspaces** | Monorepo — chia sẻ `node_modules`, chạy filter theo package |
| **Docker Compose** | PostgreSQL + pgAdmin local, không cần install Postgres thủ công |
| **Vercel** | Production hosting — 2 project riêng biệt (backend = serverless Functions, frontend = Next.js native), backend nối Neon Postgres qua `DATABASE_URL` |
| **n8n** (external, không nằm trong repo) | Workflow tự động theo dõi hộp thư → gọi webhook `/integrations/n8n/email-event` |

---

## Cấu trúc thư mục

```
job-application-tracker/
├── apps/
│   ├── backend/                    # NestJS API
│   │   ├── api/
│   │   │   └── index.ts            # Entry point Vercel Functions — tái dùng createApp(), memoize app instance
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap local dev: gọi createApp() + app.listen()
│   │   │   ├── create-app.ts       # Bootstrap logic dùng chung (main.ts local + api/index.ts Vercel): CORS, global prefix /api, ValidationPipe, Swagger
│   │   │   ├── app.module.ts       # Root module — DB config (DATABASE_URL hoặc DB_HOST/...), migrationsRun ở production
│   │   │   ├── data-source.ts      # DataSource riêng cho TypeORM CLI (migration:generate/run/revert)
│   │   │   ├── migrations/         # Migration files, tự chạy khi NODE_ENV=production
│   │   │   ├── auth/               # Xác thực JWT
│   │   │   ├── users/              # User entity + CRUD + đổi mật khẩu
│   │   │   ├── resumes/            # Upload CV + text extraction + Claude OCR fallback
│   │   │   │   ├── resumes.parser.ts       # pdf-parse + mammoth
│   │   │   │   └── pdf-claude-extract.ts   # Fallback: gửi PDF base64 cho Claude Haiku khi extract chất lượng kém
│   │   │   ├── companies/          # Company entity + search/autocomplete + jsonb analysis
│   │   │   ├── applications/       # Core domain: JobApplication CRUD + Kanban + mọi AI trigger
│   │   │   │   ├── job-application.entity.ts
│   │   │   │   ├── parsed-job-description.entity.ts
│   │   │   │   ├── job-match.entity.ts     # Kết quả CV-JD match
│   │   │   │   └── cover-letter.entity.ts
│   │   │   ├── ai/                 # AI abstraction layer — multi-provider, per-user config
│   │   │   │   ├── ai.service.ts           # parseJD, translateJD, matchCvJd, analyzeCompany, generateCoverLetter, classifyEmail, testConnection...
│   │   │   │   ├── ai-config.controller.ts # GET/PUT /ai-config/me, POST /ai-config/me/test
│   │   │   │   ├── user-ai-config.entity.ts
│   │   │   │   ├── providers/              # GeminiProvider, OpenaiProvider (dùng cho fallback khi chưa có config theo user)
│   │   │   │   └── prompts/                # 1 file prompt / tác vụ AI
│   │   │   ├── chat/                # AI chat assistant trả lời dựa trên application data của user
│   │   │   ├── integrations/
│   │   │   │   └── n8n/             # Webhook nhận email → AI classify → tạo suggestion
│   │   │   │       ├── n8n-config.service.ts       # Sinh/lưu API key (hash + prefix)
│   │   │   │       ├── email-suggestions.service.ts
│   │   │   │       └── guards/n8n-api-key.guard.ts # Auth riêng cho webhook, không qua JWT
│   │   │   └── storage/             # Storage abstraction: local disk (dev) vs Vercel Blob (production)
│   │   │       ├── local-storage.service.ts
│   │   │       └── blob-storage.service.ts
│   │   ├── uploads/resumes/        # File CV khi STORAGE_DRIVER=local (gitignored)
│   │   ├── vercel.json             # Rewrite mọi route về 1 serverless function
│   │   └── .env                    # Biến môi trường (tạo từ .env.example)
│   │
│   └── frontend/                   # Next.js 14 App Router
│       └── src/
│           ├── app/
│           │   ├── layout.tsx              # Root layout: font, Toaster
│           │   ├── page.tsx                # Landing page
│           │   ├── login/, register/
│           │   └── dashboard/
│           │       ├── page.tsx            # Overview: stat cards + quick links
│           │       ├── applications/page.tsx   # Kanban/Table board
│           │       ├── profile/page.tsx        # Đổi thông tin, đổi mật khẩu, quản lý CV
│           │       ├── settings/page.tsx       # Cấu hình AI provider + n8n API key
│           │       └── suggestions/page.tsx    # Duyệt gợi ý status từ email (n8n)
│           ├── components/
│           │   ├── applications/
│           │   │   ├── KanbanBoard.tsx / KanbanColumn.tsx / ApplicationCard.tsx
│           │   │   ├── AddApplicationDialog.tsx
│           │   │   └── ApplicationDetailModal.tsx  # Parse JD, translate, match CV, analyze company, cover letter
│           │   ├── chat/ChatWidget.tsx     # Floating chat, render toàn cục trong DashboardShell
│           │   └── layout/DashboardShell.tsx   # Sidebar nav, badge suggestion pending, chat widget
│           ├── lib/
│           │   ├── api.ts              # Axios instance: base URL + JWT interceptor + 401 redirect
│           │   ├── types.ts
│           │   └── api/                # applications.ts, resumes.ts, ai-config.ts, chat.ts, n8n.ts, profile.ts
│           └── store/auth.store.ts     # Zustand: user, token, login, logout, fetchMe
├── docker-compose.yml          # PostgreSQL 16 + pgAdmin (dev)
├── package.json                # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## Database Schema

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│    users    │──┐  │     resumes      │     │     job_applications    │
│─────────────│  │  │──────────────────│     │─────────────────────────│
│ id (uuid)   │  └─>│ userId           │  ┌─>│ userId                  │
│ email       │  └─>│ id (uuid)        │  │  │ companyId               │─>┌──────────┐
│ name        │     │ label            │  │  │ resumeId (nullable)     │  │companies │
│ password    │     │ fileUrl (key)    │  │  │ jobTitle                │  │──────────│
│ role        │     │ extractedText    │  │  │ jobDescription (text)   │  │ id       │
└──┬──────────┘     │ isDefault        │  │  │ sourceUrl (nullable)    │  │ name     │
   │                └──────────────────┘  │  │ status (enum)           │  │ website  │
   │                                       │  │ notes                  │  │ domain   │
   │  ┌───────────────┐   ┌──────────────┐│  │ appliedAt / updatedAt   │  │ analysis │
   ├─>│user_ai_configs│   │user_n8n_config││  └──────────┬──────────────┘  │ (jsonb)  │
   │  │───────────────│   │──────────────││             │                 └──────────┘
   │  │ userId (1:1)  │   │ userId (1:1) ││   ┌──1:1─────┼──1:1────┐   1:N │
   │  │ provider      │   │ apiKeyHash   ││   ▼          ▼         ▼
   │  │ *ApiKey x3    │   │ apiKeyPrefix ││ ┌──────────────┐ ┌───────────┐ ┌──────────────┐
   │  │ ollama*/model │   └──────────────┘│ │parsed_job_   │ │job_matches│ │cover_letters │
   │  └───────────────┘                    │ │descriptions  │ │───────────│ │──────────────│
   │                                       │ │──────────────│ │score      │ │content       │
   └──1:N──────────────────────────────>┐  │ │requiredSkills│ │matched[]  │ │language      │
                                          │  │ []niceToHave │ │missing[]  │ │resumeId      │
                              ┌───────────┴──┤ seniorityLvl │ │strengths[]│ │createdAt     │
                              │email_        │ keyReq/resp/ │ │gaps[]     │ └──────────────┘
                              │suggestions   │ benefits []  │ │summary    │
                              │──────────────│ salary/mode  │ └───────────┘
                              │userId        │ /location    │
                              │applicationId │ parsedAt     │
                              │suggestedStat │ └──────────────┘
                              │confidence    │
                              │reasoning     │
                              │resolutionStat│
                              └──────────────┘
```

**Thiết kế đáng chú ý:**

- `ParsedJobDescription`, `JobMatch` là bảng riêng, 1:1 với `JobApplication` — raw JD/CV được lưu ngay khi tạo/upload, AI xử lý xảy ra sau và có thể chạy lại (re-parse, re-match) mà không mất dữ liệu gốc.
- `CoverLetter` là bảng riêng (1:N với `JobApplication`) — một application có thể sinh nhiều draft, mỗi draft ghi lại `resumeId` nào được dùng để truy vết.
- `TEXT[]` array (PostgreSQL native) cho skills — truy vấn bằng `ANY()`, tránh JSON parsing overhead. `Company.analysis` dùng `jsonb` vì cấu trúc lồng nhau (techStack/culture/whyJoin đều là mảng).
- `@@Index([userId, status])` trên `job_applications` — Kanban board query là `WHERE userId = ? ORDER BY appliedAt DESC`, group by status ở application layer thay vì N queries.
- `user_ai_configs` / `user_n8n_configs` là 1:1 với `users` — mỗi user chỉ có 1 cấu hình AI provider và 1 API key n8n tại một thời điểm (upsert theo `userId` unique).
- `user_n8n_configs` chỉ lưu `apiKeyHash` (SHA-256) + `apiKeyPrefix` — raw key chỉ hiển thị 1 lần lúc generate, không thể xem lại.
- `email_suggestions.applicationId` là plain string FK (không phải formal relation) — tránh phụ thuộc cứng vào lifecycle của `JobApplication` khi ghi log lịch sử gợi ý.

---

## Backend — Giải thích từng module

### Bootstrap: `create-app.ts` + `main.ts` + `api/index.ts`

Logic bootstrap (global prefix `/api`, CORS theo `FRONTEND_URL`, `ValidationPipe`, Swagger) được tách thành `createApp()` dùng chung ở 2 nơi:

```
Local dev (main.ts)         Vercel (api/index.ts)
  createApp()                  createApp() → app.init() (không listen port)
  → app.listen(PORT)           → memoize appPromise ở module scope (warm invocation reuse)
                                → forward (req, res) vào Express instance bên trong
                                → lỗi init → reset appPromise = null để lần gọi sau retry được
```

Swagger (`/api/docs`) chỉ bật khi `NODE_ENV !== 'production'` — không lộ API docs ở bản deploy thật.

### `auth` module

**Luồng đăng ký:**
```
POST /api/auth/register
  → CreateUserDto (email, name, password)
  → UsersService.create() → bcrypt hash password → lưu DB
  → JwtService.sign({ sub: userId, email }) → trả về { user, token }
```

**Luồng đăng nhập:**
```
POST /api/auth/login
  → LoginDto (email, password)
  → UsersService.findByEmail() → user.comparePassword() (bcrypt.compare)
  → Nếu sai → 401 UnauthorizedException
  → Nếu đúng → sign JWT → trả về { user, token }
```

**JWT Guard (`JwtAuthGuard`):** Tất cả endpoint cần auth đều dùng `@UseGuards(JwtAuthGuard)`. Guard verify token và inject `req.user = { id, email }` vào request. Controller lấy `req.user.id` để query chỉ data của user đó — không có khái niệm admin bypass ở đây. Riêng webhook n8n dùng guard khác (xem mục n8n bên dưới).

### `users` module

CRUD User + đổi thông tin/mật khẩu. `User` entity có `@BeforeInsert @BeforeUpdate` hook để bcrypt hash password trước khi lưu. `updateProfile` cố tình dùng `.update()` thay vì `.save()` để không kích hoạt lại hook hash password khi chỉ đổi tên/email.

### `resumes` module

**Upload flow:**
```
POST /api/resumes (multipart/form-data)
  → Multer + ParseFilePipe: validate max 5MB, chỉ PDF/DOC/DOCX
  → StorageService.save() → lưu vào disk (dev) hoặc Vercel Blob (production)
  → extractTextFromFile(buffer, mimetype): PDF → pdf-parse | DOCX → mammoth
  → Nếu text extract chất lượng kém (< 100 ký tự hoặc < 30% ký tự alnum, thường gặp ở PDF scan/custom font)
      → fallback: pdf-claude-extract.ts gửi PDF (base64) cho Claude Haiku OCR
  → normalizeCvText() qua AI — chuẩn hóa thành Markdown sạch trước khi lưu
  → Nếu đây là CV đầu tiên của user → isDefault = true (auto)
  → Response không bao giờ trả fileUrl/storage key thô ra ngoài (omitFileUrl helper)
```

**Xóa CV:** Nếu xóa CV đang là default → tự động promote CV mới nhất còn lại lên làm default.

### `companies` module

`GET /companies/search?q=...` cho autocomplete UI. Logic chính là `findOrCreate(name)` được `ApplicationsService` gọi nội bộ — tìm theo `ILike` (case-insensitive), nếu không tìm thấy thì tạo mới. `Company.analysis` (jsonb) được ghi lại từ tính năng AI Company Analysis, tái sử dụng giữa các application cùng công ty.

### `applications` module

**Core domain — module phức tạp nhất, mọi AI action đều nằm ở đây:**

```
POST /applications                       → tạo mới, findOrCreate company, status = APPLIED
GET  /applications/kanban                → group theo status ở application layer (không SQL GROUP BY)
PATCH /applications/:id/status           → update 1 field, dùng riêng cho drag-drop
POST /applications/:id/parse-jd          → AI trích xuất skills/seniority/requirements từ JD
POST /applications/:id/translate-jd      → AI dịch key requirements/responsibilities/benefits (yêu cầu đã parse trước)
POST /applications/:id/match-cv          → { resumeId } — AI chấm điểm CV↔JD, tự re-extract text nếu bản lưu chất lượng kém
POST /applications/:id/analyze-company   → AI phân tích công ty, tự thu thập context (DuckDuckGo + homepage) trước khi gọi AI
POST /applications/:id/cover-letter      → { resumeId, language, maxLength? } — sinh cover letter, mỗi lần gọi là 1 record mới
```

**Tại sao group Kanban ở application layer thay vì SQL?** Với số lượng applications của 1 user (thường < 500), một query đơn + group bằng JS nhanh hơn và đơn giản hơn 6 query riêng.

**Company Analysis không dùng search API trả phí:** tự query DuckDuckGo Instant Answer API + scrape/strip HTML trang chủ công ty (regex, cap 3000 ký tự, timeout 5-6s) để build context, rồi mới gọi AI — tránh chi phí search API cho một tính năng phụ.

### `ai` module — multi-provider, cấu hình theo từng user

```
AiService (mọi method nhận thêm userId, dùng để resolve provider của đúng user đó)
  ├── parseJobDescription / translateJd / matchCvJd / analyzeCompany
  ├── generateCoverLetter / classifyEmail / normalizeCvText
  ├── complete(prompt, userId)     ← dùng bởi chat module
  └── testConnection(userId)       ← nút "Test kết nối" ở Settings, gửi "PONG" test

resolveCompleter(userId):
  có UserAiConfig? → switch theo config.provider:
    ├── 'openai'    → OpenAI SDK, gpt-4o-mini, key = config hoặc env OPENAI_API_KEY
    ├── 'anthropic' → Anthropic SDK, model = config.anthropicModel (mặc định claude-haiku-4-5),
    │                  key = config hoặc env ANTHROPIC_API_KEY
    ├── 'ollama'    → fetch thẳng {config.ollamaBaseUrl}/api/generate (local, không cần internet)
    └── 'gemini'    → GoogleGenAI SDK, gemini-2.0-flash (mặc định)
  không có config (chưa đăng nhập / chưa cấu hình) → fallback về env AI_PROVIDER (gemini|openai)
```

**Cấu hình per-user** (`UserAiConfig`, `GET/PUT /ai-config/me`, `POST /ai-config/me/test`) — mỗi user tự chọn provider + tự nhập API key riêng trong Settings; để trống thì dùng key mặc định của server (`.env`). Đây là thiết kế khác hoàn toàn so với bản đầu chỉ có 1 biến `AI_PROVIDER` chọn cho toàn hệ thống — biến đó giờ chỉ còn là fallback cho trường hợp chưa có config theo user.

**Lưu ý:** `ANTHROPIC_API_KEY` phục vụ **2 mục đích độc lập**: (1) OCR fallback khi trích xuất PDF lỗi (`pdf-claude-extract.ts`, luôn dùng key server, không qua config user), và (2) key mặc định cho provider Anthropic khi user chọn nhưng không tự nhập key riêng.

**Tại sao AI call là synchronous (không dùng queue)?** Mọi tác vụ AI đều one-shot, user-initiated (click button → chờ vài giây → nhận kết quả), không phải continuous flow. Thêm BullMQ sẽ là over-engineering cho use case này.

### `chat` module

`POST /chat` — nhận `{ message, history }`, backend tự lấy 40 application gần nhất của user (kèm company), build prompt tiếng Việt chứa thống kê theo status + 25 application gần nhất (title/company/status/ngày/note rút gọn) + lịch sử hội thoại, gọi `AiService.complete()` theo đúng provider user đã cấu hình. **Không lưu lịch sử chat ở backend** — history sống trong state của `ChatWidget` phía frontend, mất khi reload trang.

### `integrations/n8n` module

Pipeline gợi ý cập nhật trạng thái ứng tuyển từ email, không cần user tự vào app cập nhật tay:

```
1. User bấm "Tạo API Key" ở Settings → nhận API key dạng n8n_<48 hex>, hiển thị 1 lần duy nhất
   (server chỉ lưu SHA-256 hash + 12 ký tự đầu để hiển thị lại)
2. User tự cấu hình workflow n8n (ngoài repo này) theo dõi hộp thư, khi có email liên quan
   → POST /integrations/n8n/email-event { from, subject, body, receivedAt? }
   → xác thực bằng N8nApiKeyGuard (Authorization: Bearer <key>, hash rồi so khớp — KHÔNG qua JWT)
3. EmailSuggestionsService lấy toàn bộ application đang active (khác REJECTED/WITHDRAWN) của user
   → AiService.classifyEmail() → xác định email khớp application nào + status gợi ý + confidence + lý do
   → chỉ tạo EmailSuggestion nếu confidence >= 60 và applicationId hợp lệ
   → lỗi ở bất kỳ bước nào đều bị nuốt, webhook luôn trả về bình thường (không làm n8n workflow fail)
4. User vào trang Suggestions → duyệt (accept: áp status vào application) hoặc từ chối (dismiss)
```

### `storage` module

`StorageService` abstract (`save/read/delete`), chọn implementation qua `STORAGE_DRIVER`:
- `local` (mặc định, dev) — ghi vào `uploads/resumes/`, sanitize filename, chặn path traversal (resolve path tuyệt đối rồi assert nằm trong upload dir).
- `blob` (production) — dùng `@vercel/blob`, bắt buộc có `BLOB_READ_WRITE_TOKEN`. Cần thiết vì serverless function không có disk bền vững giữa các lần invoke.

---

## Frontend — Giải thích từng phần

### Routing strategy

```
app/
├── page.tsx                    ← SSR (marketing, SEO)
├── login/, register/           ← SSR (không cần auth)
└── dashboard/                  ← CSR ('use client') vì:
    │                              1. Cần auth check (localStorage → phải client-side)
    │                              2. Kanban drag-and-drop là purely interactive
    ├── applications/page.tsx   ← Kanban/Table board + modal chi tiết
    ├── profile/page.tsx        ← Thông tin cá nhân + quản lý CV
    ├── settings/page.tsx       ← Cấu hình AI provider + n8n API key
    └── suggestions/page.tsx    ← Duyệt gợi ý từ email (n8n)
```

**Tại sao dashboard không dùng Server Components?** Auth token lưu trong localStorage — không thể đọc ở server. Toàn bộ dashboard là client-side với auth guard trong `useEffect`.

### Axios interceptors (`lib/api.ts`)

```
Request interceptor:  đọc token từ localStorage → thêm Authorization: Bearer <token> vào mọi request
Response interceptor: nếu 401 → xóa token + redirect về /login (xử lý 1 lần, không cần check ở từng component)
```

### Zustand auth store (`store/auth.store.ts`)

State toàn cục cho auth — không cần Provider wrapper, persist token từ localStorage ngay khi khởi tạo store, action `fetchMe()` gọi `/auth/me` để lấy user info khi refresh trang.

### `DashboardShell` — layout dùng chung cho mọi trang `/dashboard/*`

Sidebar nav + logout + badge số lượng suggestion đang PENDING (poll mỗi 30s qua `n8n.ts`) + render `ChatWidget` toàn cục nên chat luôn khả dụng dù đang ở trang nào trong dashboard.

### Kanban board (`components/applications/KanbanBoard.tsx`)

```
KanbanBoard (DndContext)
├── PointerSensor activationConstraint: { distance: 5 } → phải di chuyển 5px mới trigger drag, tránh nhầm click
├── onDragStart → set activeApp (để DragOverlay render ghost card)
├── onDragEnd
│   ├── Nếu drop cùng column → no-op
│   ├── Optimistic update: setGroups() ngay lập tức
│   ├── PATCH /applications/:id/status async
│   └── Lỗi → rollback về snapshot trước + toast.error
└── DragOverlay → floating card theo cursor
```

**Optimistic update pattern:** State thay đổi ngay khi user thả card, API call chạy async ở background, rollback nếu lỗi — pattern chuẩn cho Kanban UX, người dùng không cần chờ network.

### `ApplicationDetailModal`

Mở modal → fetch song song detail (`parsedJd`, `jobMatch`, `coverLetters`) + danh sách resume. Các action AI (Parse JD, Translate, Match CV, Analyze Company, Generate/Regenerate Cover Letter) đều là nút bấm rời — không auto-trigger, vì AI call tốn tiền/thời gian và người dùng thường batch-log nhiều application trước rồi mới xử lý từng cái khi thực sự cần.

### `Settings` page

3 khối: (1) chọn + cấu hình AI provider (Gemini/OpenAI/Anthropic/Ollama, mỗi provider có field riêng — API key hoặc base URL + model tùy loại) kèm nút Test kết nối; (2) tích hợp n8n — hiển thị webhook URL, sinh/hiển thị API key; (3) (nếu có) các cấu hình khác của tài khoản.

### `ChatWidget`

Floating chat button, gọi `POST /chat` với message + toàn bộ history trong state component (không persist), hiển thị câu trả lời dạng hội thoại về tình trạng ứng tuyển của chính user.

---

## Luồng dữ liệu chính

### Luồng 1: Thêm application mới

```
User nhập form (AddApplicationDialog)
  → POST /api/applications { companyName, jobTitle, jobDescription, ... }
  → Backend: findOrCreate(company) → save JobApplication
  → Frontend: prepend vào groups.APPLIED, card xuất hiện ngay (không cần refresh)
```

### Luồng 2: Drag card sang cột khác

```
User kéo card → onDragEnd: active.id (appId), over.id (newStatus)
  → Optimistic: state update ngay
  → Async: PATCH /applications/:id/status { status: newStatus }
  → Lỗi → rollback + toast.error
```

### Luồng 3: Parse JD → Match CV → Cover Letter (trong modal chi tiết)

```
User click "Parse JD"      → POST .../parse-jd     → hiển thị skills/seniority/requirements
User click "Match CV"      → POST .../match-cv     → hiển thị score + matched/missing skills
User click "Generate Cover Letter" → POST .../cover-letter → editable textarea → copy to clipboard
```

### Luồng 4: Email → gợi ý cập nhật status (n8n, không cần user thao tác tay)

```
n8n workflow (bên ngoài app) phát hiện email mới
  → POST /integrations/n8n/email-event (auth bằng API key riêng)
  → Backend: classifyEmail() khớp application + confidence
  → Nếu confidence đủ cao → tạo EmailSuggestion (PENDING)
  → User vào trang /dashboard/suggestions → Accept (áp status) hoặc Dismiss
```

### Luồng 5: Chat hỏi-đáp về tình trạng ứng tuyển

```
User gõ câu hỏi trong ChatWidget
  → POST /chat { message, history }
  → Backend build prompt từ 40 application gần nhất + lịch sử hội thoại
  → AI trả lời theo provider user đã cấu hình → hiển thị trong widget
```

---

## API Reference

> Base URL: `http://localhost:4000/api` (dev) | Swagger: `http://localhost:4000/api/docs` (chỉ dev)

Tất cả endpoint (trừ `/auth/register`, `/auth/login`, và webhook n8n) đều yêu cầu header:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Path | Body | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | `{ email, name, password }` | Đăng ký + trả về JWT |
| POST | `/auth/login` | `{ email, password }` | Đăng nhập + trả về JWT |
| GET | `/auth/me` | — | Lấy thông tin user hiện tại |

### Users

| Method | Path | Body | Mô tả |
|---|---|---|---|
| PATCH | `/users/me` | `{ name?, email? }` | Cập nhật hồ sơ |
| PATCH | `/users/me/password` | `{ currentPassword, newPassword }` | Đổi mật khẩu |

### Resumes

| Method | Path | Body | Mô tả |
|---|---|---|---|
| POST | `/resumes` | `multipart: { file, label }` | Upload CV (PDF/DOC/DOCX, max 5MB) |
| GET | `/resumes` | — | Danh sách CV (không có fileUrl/extractedText) |
| GET | `/resumes/:id` | — | Chi tiết 1 CV (có extractedText) |
| PATCH | `/resumes/:id/default` | — | Đặt làm CV mặc định |
| DELETE | `/resumes/:id` | — | Xóa CV + file trên storage |

### Companies

| Method | Path | Query | Mô tả |
|---|---|---|---|
| GET | `/companies/search` | `?q=string` | Tìm kiếm công ty (autocomplete, max 10 kết quả) |

### Applications

| Method | Path | Body / Query | Mô tả |
|---|---|---|---|
| POST | `/applications` | `{ companyName, jobTitle, jobDescription, sourceUrl?, resumeId? }` | Tạo application |
| GET | `/applications` | `?status=APPLIED` (optional) | Danh sách (tóm tắt) |
| GET | `/applications/kanban` | — | Grouped by status → dùng cho Kanban initial load |
| GET | `/applications/:id` | — | Chi tiết đầy đủ (parsedJd, jobMatch, coverLetters) |
| PATCH | `/applications/:id/status` | `{ status }` | Chỉ update status — dùng cho drag-drop |
| PATCH | `/applications/:id` | `{ jobTitle?, jobDescription?, sourceUrl?, resumeId? }` | Update thông tin |
| DELETE | `/applications/:id` | — | Xóa application |
| POST | `/applications/:id/parse-jd` | — | Trigger AI parse JD (upsert) |
| POST | `/applications/:id/translate-jd` | `{ targetLanguage? }` | Dịch nội dung JD đã parse |
| POST | `/applications/:id/match-cv` | `{ resumeId }` | Chấm điểm CV↔JD |
| POST | `/applications/:id/analyze-company` | — | Phân tích công ty |
| POST | `/applications/:id/cover-letter` | `{ resumeId, language?, maxLength? }` | Sinh cover letter |

### AI Config

| Method | Path | Body | Mô tả |
|---|---|---|---|
| GET | `/ai-config/me` | — | Lấy cấu hình AI provider hiện tại của user |
| PUT | `/ai-config/me` | `{ provider, geminiApiKey?, openaiApiKey?, anthropicApiKey?, anthropicModel?, ollamaBaseUrl?, ollamaModel? }` | Lưu cấu hình |
| POST | `/ai-config/me/test` | — | Test kết nối với provider hiện tại (gửi "PONG") |

### Chat

| Method | Path | Body | Mô tả |
|---|---|---|---|
| POST | `/chat` | `{ message, history: [{role, content}] }` | Hỏi-đáp AI dựa trên application data của user |

### n8n Integration

| Method | Path | Auth | Body | Mô tả |
|---|---|---|---|---|
| POST | `/integrations/n8n/config/regenerate` | JWT | — | Sinh API key mới (trả raw key 1 lần) |
| GET | `/integrations/n8n/config` | JWT | — | `{ configured, apiKeyPrefix }` |
| POST | `/integrations/n8n/email-event` | **API key riêng** (Bearer) | `{ from, subject, body, receivedAt? }` | Webhook nhận email — n8n workflow gọi vào đây |
| GET | `/integrations/n8n/suggestions` | JWT | — | Danh sách gợi ý đang PENDING |
| POST | `/integrations/n8n/suggestions/:id/accept` | JWT | — | Áp status gợi ý vào application |
| POST | `/integrations/n8n/suggestions/:id/dismiss` | JWT | — | Từ chối gợi ý |

### ApplicationStatus enum

```
APPLIED → SCREENING → INTERVIEW → OFFER
                                → REJECTED
WITHDRAWN  (có thể set ở bất kỳ bước nào)
```

---

## Cài đặt & Khởi động

### Yêu cầu

- Node.js >= 18
- pnpm >= 8
- Docker Desktop (đang chạy)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Cấu hình môi trường backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Sau đó thêm ít nhất `GEMINI_API_KEY` vào `apps/backend/.env` (xem đầy đủ ở [Biến môi trường](#biến-môi-trường)):

```env
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — dùng làm fallback OCR cho PDF khó đọc:
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Người dùng cuối vẫn có thể tự chọn provider khác (OpenAI/Anthropic/Ollama) và nhập key riêng trong Settings sau khi đăng nhập — không bắt buộc phải có sẵn mọi key trong `.env`.

### 3. Khởi động database

```bash
pnpm db:up
```

### 4. Khởi động backend + frontend

```bash
pnpm dev
```

Chạy song song cả 2 app (`pnpm --parallel --filter=./apps/* dev`). TypeORM tự động tạo/sync schema ở dev (`synchronize: true`). Muốn chạy riêng từng app: `pnpm --filter=backend dev` / `pnpm --filter=frontend dev`.

**URLs:**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| Swagger Docs | http://localhost:4000/api/docs |
| pgAdmin | http://localhost:5050 (email: admin@admin.com / pass: admin) |

### Migrations (khi cần chạy thủ công, ví dụ ở local nhắm vào DB khác)

```bash
pnpm db:migrate            # chạy migration:run cho backend
pnpm --filter=backend migration:generate -- src/migrations/TenMigration
pnpm --filter=backend migration:revert
```

---

## Biến môi trường

### `apps/backend/.env`

| Biến | Mặc định | Mô tả |
|---|---|---|
| `NODE_ENV` | `development` | `production` tắt Swagger, tắt `synchronize`, bật `migrationsRun` tự động |
| `PORT` | `4000` | Port backend (chỉ dùng khi `app.listen()` — local dev) |
| `DATABASE_URL` | — | Connection string Postgres đầy đủ (production/Neon) — nếu set sẽ override toàn bộ `DB_HOST`/... và bật SSL |
| `DB_HOST` | `localhost` | PostgreSQL host (dev, khi không set `DATABASE_URL`) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | DB username |
| `DB_PASSWORD` | `postgres` | DB password |
| `DB_NAME` | `fullstack_db` | Tên database |
| `JWT_SECRET` | *(xem .env.example)* | Secret key JWT — đổi ở production |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn token |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `GEMINI_API_KEY` | — | Key mặc định server cho provider Gemini |
| `AI_PROVIDER` | `gemini` | `gemini` hoặc `openai` — chỉ áp dụng khi user **chưa** cấu hình provider riêng trong Settings |
| `OPENAI_API_KEY` | — | Key mặc định server cho provider OpenAI |
| `ANTHROPIC_API_KEY` | — | Dùng cho 2 việc: (1) OCR fallback khi extract PDF lỗi, (2) key mặc định server cho provider Anthropic |
| `STORAGE_DRIVER` | `local` | `local` (disk) hoặc `blob` (Vercel Blob) — production nên dùng `blob` |
| `BLOB_READ_WRITE_TOKEN` | — | Bắt buộc khi `STORAGE_DRIVER=blob`, tự có khi link Vercel Blob store |

### `apps/frontend/.env.local` (optional)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Backend API URL — production trỏ vào URL project backend đã deploy |

---

## Triển khai lên Vercel

App được deploy dưới dạng **2 Vercel project riêng biệt** trong cùng monorepo:

```
Project "backend"   Root Directory: apps/backend    → serverless Functions-only
Project "frontend"  Root Directory: apps/frontend   → Next.js native runtime
```

**Backend:**
- `vercel.json` rewrite mọi request về 1 function duy nhất (`api/index.ts`); `outputDirectory: public` chỉ để thỏa mãn yêu cầu build output của Vercel cho project không có static asset riêng.
- `api/index.ts` khởi tạo NestJS app 1 lần, cache instance ở module scope để warm invocation không phải init lại; lỗi init sẽ trả 500 rõ ràng thay vì crash im lặng.
- Cần set trên Vercel (Environment Variables, Production): `DATABASE_URL` (Neon Postgres, qua Vercel Storage tab), `BLOB_READ_WRITE_TOKEN` (Vercel Blob store), `JWT_SECRET`, `FRONTEND_URL`, `STORAGE_DRIVER=blob`, và ít nhất 1 AI key server-level (`GEMINI_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`).
- **Migration tự động chạy khi cold start** ở production (`migrationsRun: true` khi `NODE_ENV=production`, xem `app.module.ts`) — không cần chạy `migration:run` thủ công sau mỗi lần deploy có thêm migration mới. Các migration được viết dạng `ADD COLUMN IF NOT EXISTS` để an toàn nếu nhiều cold start cùng chạy migration song song.
- ⚠️ Các biến môi trường production trên Vercel (đặc biệt `DATABASE_URL`) thường bị đánh dấu **Sensitive** — không pull được giá trị thật về máy qua `vercel env pull`, kể cả với quyền owner. Đây là tính năng bảo mật cố ý, không phải lỗi. Muốn chạy thao tác cần DB thật từ máy local, lấy connection string trực tiếp từ Neon dashboard.

**Frontend:**
- Không cần `vercel.json` riêng — Vercel tự nhận diện Next.js.
- `next.config.mjs` rewrite `/api/:path*` → `${NEXT_PUBLIC_API_URL}/:path*`, nên bắt buộc set `NEXT_PUBLIC_API_URL` trỏ đúng URL project backend đã deploy.

**Deploy thủ công (không qua git push tự động):**
```bash
cd apps/backend  && vercel --prod
cd apps/frontend && vercel --prod
```

---

## Lưu ý

- **TypeORM `synchronize: true`** chỉ dùng ở development — schema tự đồng bộ với entity. Production dùng migrations, tự chạy khi app khởi động (xem [Triển khai lên Vercel](#triển-khai-lên-vercel)).
- **CV files** lưu tại `apps/backend/uploads/resumes/` khi `STORAGE_DRIVER=local` (gitignored); production dùng Vercel Blob.
- **AI không tự động chạy** khi tạo application — mọi tác vụ AI (parse JD, match CV, analyze company, cover letter) đều là explicit user action để tránh tốn API quota không cần thiết.
- **Chat không lưu lịch sử** ở backend — mỗi lần reload trang, hội thoại chat mất, chỉ context application data là được truy vấn lại real-time.
