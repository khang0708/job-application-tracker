# Job Application Tracker

Ứng dụng SaaS quản lý hồ sơ ứng tuyển việc làm, tích hợp AI để trích xuất yêu cầu JD và tự động sinh cover letter. Giao diện chính là Kanban board drag-and-drop theo pipeline: Applied → Screening → Interview → Offer → Rejected.

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

---

## Tính năng

| Tính năng | Mô tả |
|---|---|
| **Auth** | Đăng ký / đăng nhập bằng email + password, JWT stateless |
| **Resume upload** | Upload CV dạng PDF hoặc DOCX, tự động trích xuất text để AI dùng |
| **Job Application CRUD** | Thêm / sửa / xóa đơn ứng tuyển |
| **Kanban board** | Drag-and-drop cards giữa các cột trạng thái; optimistic update |
| **AI — Parse JD** | Phân tích Job Description → trích xuất required skills, nice-to-have, seniority, key requirements |
| **AI — Cover Letter** | Sinh cover letter dựa trên CV + JD đã parse; hỗ trợ EN/VI; editable sau khi sinh |
| **Đa CV** | Upload nhiều phiên bản CV, chọn CV nào dùng để sinh cover letter |
| **Company autocomplete** | Tên công ty được dedup và gợi ý khi nhập |

---

## Tech Stack & Lý do chọn

### Backend

| Công nghệ | Lý do |
|---|---|
| **NestJS** | Modular monolith, DI container, decorator-based — cấu trúc rõ ràng, dễ scale từng module |
| **TypeORM** | ORM cho PostgreSQL, tích hợp sẵn với NestJS, entity-based schema sync ở dev |
| **PostgreSQL 16** | Hỗ trợ native `TEXT[]` array (dùng cho skills list), JSON, full-text search khi cần |
| **Multer** | File upload middleware tích hợp sẵn với NestJS/Express |
| **pdf-parse + mammoth** | Text extraction từ PDF và DOCX — 2 format phổ biến nhất cho CV |
| **@google/genai** | Gemini 2.0 Flash — nhanh, rẻ hơn GPT-4o, đủ tốt cho structured extraction + text generation |
| **openai** | Fallback provider, switch bằng env var `AI_PROVIDER=openai` |
| **JWT (passport-jwt)** | Stateless auth, không cần session store |
| **Swagger** | Auto-generated API docs tại `/api/docs` |

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

---

## Cấu trúc thư mục

```
fullstack-app/
├── apps/
│   ├── backend/                    # NestJS API (port 4000)
│   │   ├── src/
│   │   │   ├── main.ts             # Bootstrap: CORS, global prefix /api, Swagger, ValidationPipe
│   │   │   ├── app.module.ts       # Root module — import tất cả modules
│   │   │   ├── auth/               # Xác thực JWT
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── dto/login.dto.ts
│   │   │   │   ├── guards/jwt-auth.guard.ts
│   │   │   │   └── strategies/jwt.strategy.ts
│   │   │   ├── users/              # User entity + CRUD
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── dto/create-user.dto.ts
│   │   │   ├── resumes/            # Upload CV + text extraction
│   │   │   │   ├── resume.entity.ts
│   │   │   │   ├── resumes.service.ts
│   │   │   │   ├── resumes.controller.ts
│   │   │   │   ├── resumes.parser.ts   # pdf-parse + mammoth
│   │   │   │   └── dto/create-resume.dto.ts
│   │   │   ├── companies/          # Company entity + search/autocomplete
│   │   │   │   ├── company.entity.ts
│   │   │   │   ├── companies.service.ts
│   │   │   │   └── companies.controller.ts
│   │   │   ├── applications/       # Core domain: JobApplication CRUD + AI triggers
│   │   │   │   ├── job-application.entity.ts
│   │   │   │   ├── parsed-job-description.entity.ts
│   │   │   │   ├── cover-letter.entity.ts
│   │   │   │   ├── application-status.enum.ts
│   │   │   │   ├── applications.service.ts
│   │   │   │   ├── applications.controller.ts
│   │   │   │   └── dto/
│   │   │   │       ├── create-application.dto.ts
│   │   │   │       ├── update-application.dto.ts
│   │   │   │       ├── update-status.dto.ts       # lightweight, dùng riêng cho drag-drop
│   │   │   │       └── generate-cover-letter.dto.ts
│   │   │   └── ai/                 # AI abstraction layer
│   │   │       ├── ai.service.ts       # Provider switching + JSON parsing
│   │   │       ├── ai.module.ts
│   │   │       ├── providers/
│   │   │       │   ├── gemini.provider.ts  # Primary: gemini-2.0-flash
│   │   │       │   └── openai.provider.ts  # Fallback: gpt-4o-mini
│   │   │       └── prompts/
│   │   │           ├── jd-parsing.prompt.ts    # Structured JSON output
│   │   │           └── cover-letter.prompt.ts  # Style-locked template
│   │   ├── uploads/resumes/        # File CV được lưu tại đây (gitignored)
│   │   └── .env                    # Biến môi trường (tạo từ .env.example)
│   │
│   └── frontend/                   # Next.js 14 App Router (port 3000)
│       └── src/
│           ├── app/
│           │   ├── layout.tsx              # Root layout: font, Toaster
│           │   ├── page.tsx                # Landing page
│           │   ├── providers.tsx           # React Query provider
│           │   ├── dashboard/
│           │   │   ├── page.tsx            # Dashboard overview → link tới Applications
│           │   │   └── applications/
│           │   │       └── page.tsx        # Kanban board page
│           │   ├── login/page.tsx
│           │   └── register/page.tsx
│           ├── components/
│           │   └── applications/
│           │       ├── KanbanBoard.tsx         # DndContext, state, optimistic update
│           │       ├── KanbanColumn.tsx         # useDroppable + card list
│           │       ├── ApplicationCard.tsx      # useDraggable + click to open modal
│           │       ├── AddApplicationDialog.tsx # Form modal thêm application mới
│           │       └── ApplicationDetailModal.tsx # Parse JD + Generate cover letter
│           ├── lib/
│           │   ├── api.ts              # Axios instance: base URL + JWT interceptor + 401 redirect
│           │   ├── types.ts            # Shared TypeScript types (Application, ParsedJd, ...)
│           │   └── api/
│           │       ├── applications.ts # Typed wrappers cho mọi application endpoint
│           │       └── resumes.ts      # GET /resumes
│           └── store/
│               └── auth.store.ts       # Zustand: user, token, login, logout, fetchMe
├── docker-compose.yml          # PostgreSQL 16 + pgAdmin
├── package.json                # pnpm workspace root + ignoredBuiltDependencies
└── pnpm-workspace.yaml
```

---

## Database Schema

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────────────┐
│    users    │──┐    │     resumes      │       │     job_applications    │
│─────────────│  │    │──────────────────│       │─────────────────────────│
│ id (uuid)   │  └───>│ userId           │   ┌──>│ userId                  │
│ email       │  └───>│ id (uuid)        │   │   │ companyId               │──>┌──────────┐
│ name        │       │ label            │   │   │ resumeId (nullable)     │   │companies │
│ password    │       │ fileUrl          │   │   │ jobTitle                │   │──────────│
│ role        │       │ extractedText    │   │   │ jobDescription (text)   │   │ id       │
└─────────────┘       │ isDefault        │   │   │ sourceUrl (nullable)    │   │ name     │
      │               └──────────────────┘   │   │ status (enum)           │   │ website  │
      └─────────────────────────────────────>┘   │ appliedAt               │   └──────────┘
                                                  │ updatedAt               │
                                                  └─────────────────────────┘
                                                            │ 1:1                │ 1:N
                                              ┌────────────┘        ┌───────────┘
                                              ▼                      ▼
                                ┌──────────────────────┐  ┌──────────────────┐
                                │ parsed_job_descriptions│  │  cover_letters   │
                                │──────────────────────│  │──────────────────│
                                │ applicationId (unique)│  │ applicationId    │
                                │ requiredSkills text[] │  │ resumeId         │
                                │ niceToHaveSkills []   │  │ content (text)   │
                                │ seniorityLevel        │  │ language (en/vi) │
                                │ keyRequirements []    │  │ createdAt        │
                                │ parsedAt              │  └──────────────────┘
                                └──────────────────────┘
```

**Thiết kế đáng chú ý:**

- `ParsedJobDescription` là bảng riêng (1:1 với `JobApplication`) thay vì cột JSON trong `job_applications` — lý do: raw JD được lưu ngay khi tạo application, parsing xảy ra sau và có thể chạy lại mà không mất dữ liệu gốc.
- `CoverLetter` là bảng riêng (1:N với `JobApplication`) — một application có thể sinh nhiều draft, mỗi draft ghi lại `resumeId` nào được dùng để truy vết.
- `TEXT[]` array (PostgreSQL native) cho skills — truy vấn bằng `ANY()`, tránh JSON parsing overhead.
- `@@Index([userId, status])` trên `job_applications` — Kanban board query là `WHERE userId = ? ORDER BY appliedAt DESC`, group by status ở application layer thay vì N queries.

---

## Backend — Giải thích từng module

### `main.ts` — Bootstrap

```
Nest App
  ├── Global prefix: /api         → mọi route đều có prefix /api
  ├── CORS: FRONTEND_URL           → chỉ cho phép frontend gọi
  ├── ValidationPipe               → tự động validate DTO, strip unknown fields
  └── Swagger: /api/docs           → auto-generated từ decorators
```

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

**JWT Guard (`JwtAuthGuard`):** Tất cả endpoint cần auth đều dùng `@UseGuards(JwtAuthGuard)`. Guard verify token và inject `req.user = { id, email }` vào request. Controller lấy `req.user.id` để query chỉ data của user đó — không có khái niệm admin bypass ở đây.

### `users` module

Đơn giản: CRUD User. `User` entity có `@BeforeInsert @BeforeUpdate` hook để bcrypt hash password trước khi lưu — password không bao giờ lưu plaintext.

### `resumes` module

**Upload flow:**
```
POST /api/resumes (multipart/form-data)
  → Multer: lưu file vào uploads/resumes/{timestamp}-{random}.{ext}
  → ParseFilePipe: validate max 5MB, chỉ PDF/DOCX
  → extractTextFromFile(buffer, mimetype)
      ├── PDF  → pdf-parse → result.text
      └── DOCX → mammoth.extractRawText({ buffer }) → result.value
  → Nếu đây là CV đầu tiên của user → isDefault = true (auto)
  → Lưu DB: { userId, label, fileUrl (path trên disk), extractedText, isDefault }
```

**Lý do extract text ngay khi upload:** AI cần text content, không cần file gốc. Extract 1 lần, tái dùng mãi mãi cho mọi lần generate cover letter. Không phải re-extract mỗi request.

**Xóa CV:** Nếu xóa CV đang là default → tự động promote CV mới nhất còn lại lên làm default.

### `companies` module

Chỉ có `GET /companies/search?q=...` (dùng cho autocomplete UI). Logic chính là `findOrCreate(name)` được `ApplicationsService` gọi nội bộ — tìm theo `ILike` (case-insensitive), nếu không tìm thấy thì tạo mới. Người dùng không cần biết đến company ID.

### `applications` module

**Core domain — đây là module phức tạp nhất:**

**Tạo application:**
```
POST /api/applications
  → { companyName, jobTitle, jobDescription, sourceUrl?, resumeId? }
  → CompaniesService.findOrCreate(companyName)   ← dedup company
  → Tạo JobApplication với status = APPLIED (default)
  → Trả về application + company (eager load)
```

**Kanban load:**
```
GET /api/applications/kanban
  → Query tất cả applications của user với relations ['company']
  → Group by status ở application layer (không dùng GROUP BY SQL)
  → Trả về: { APPLIED: [...], SCREENING: [...], INTERVIEW: [...], ... }
```

**Tại sao group ở application layer thay vì SQL?** Với số lượng applications của 1 user (thường < 500), một query đơn + group bằng JS nhanh hơn và đơn giản hơn 6 queries riêng. Nếu scale lên hàng nghìn thì mới cần xem xét lại.

**Drag-and-drop status update:**
```
PATCH /api/applications/:id/status
  → { status: "SCREENING" }
  → Chỉ update 1 field, lightweight
  → Endpoint riêng biệt để controller rõ ràng về intent
```

**AI — Parse JD:**
```
POST /api/applications/:id/parse-jd
  → Lấy app.jobDescription
  → AiService.parseJobDescription({ jobDescriptionText })
  → Upsert ParsedJobDescription (có thể re-parse, không mất data gốc)
  → Trả về parsed result
```

**AI — Generate Cover Letter:**
```
POST /api/applications/:id/cover-letter
  → { resumeId, language, maxLength? }
  → Verify resume thuộc về user (ForbiddenException nếu không)
  → AiService.generateCoverLetter({ resumeText, jobDescriptionText, parsedJd, language })
  → Lưu CoverLetter mới vào DB (mỗi lần generate là 1 record riêng)
  → Trả về cover letter
```

### `ai` module

```
AiService
  ├── parseJobDescription(params)
  │     → buildJdParsingPrompt(params)   # structured JSON output prompt
  │     → provider.complete(prompt)
  │     → parseJsonResponse(raw)         # strip ```json fences, JSON.parse, validate shape
  │     → ParsedJdResult
  │
  └── generateCoverLetter(params)
        → buildCoverLetterPrompt(params)  # locked style template
        → provider.complete(prompt)
        → strip markdown fences
        → plain text string

Provider selection: AI_PROVIDER env var
  ├── 'openai'  → OpenaiProvider  (gpt-4o-mini)
  └── default   → GeminiProvider  (gemini-2.0-flash)
```

**Tại sao AI call là synchronous (không dùng queue)?**
JD parsing và cover letter generation là one-shot, user-initiated (click button → wait ~3s → nhận kết quả). Không phải continuous flow. Thêm BullMQ sẽ là over-engineering. Contrast với Interview Prep Platform (IPP) dùng queue vì real-time interview session — đây là thiết kế phù hợp với use case, không phải thiếu sót.

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
    └── applications/page.tsx
```

**Tại sao dashboard không dùng Server Components?** Auth token lưu trong localStorage — không thể đọc ở server. Toàn bộ dashboard là client-side với auth guard trong `useEffect`.

### Axios interceptors (`lib/api.ts`)

```
Request interceptor:
  → Đọc token từ localStorage
  → Thêm Authorization: Bearer <token> vào mọi request

Response interceptor:
  → Nếu 401 → xóa token + redirect về /login
  → Xử lý 1 lần, không phải check ở từng component
```

### Zustand auth store (`store/auth.store.ts`)

State toàn cục cho auth. Lý do chọn Zustand thay vì React Context:
- Không cần Provider wrapper
- Persist token từ localStorage ngay khi khởi tạo store
- Action `fetchMe()` gọi `/auth/me` để lấy user info khi refresh trang

### Kanban board (`components/applications/KanbanBoard.tsx`)

```
KanbanBoard (DndContext)
├── State: groups (KanbanGroups), activeApp (đang drag), selectedAppId (modal)
├── PointerSensor với activationConstraint: { distance: 5 }
│     → Phải di chuyển 5px mới trigger drag → tránh nhầm với click
│
├── onDragStart → set activeApp (để DragOverlay render ghost card)
│
├── onDragEnd
│   ├── Tìm currentStatus của card đang drag
│   ├── Nếu drop vào cùng column → return (no-op)
│   ├── Optimistic update: setGroups(moveCard(...))  ← instant UI response
│   ├── PATCH /applications/:id/status               ← async API call
│   └── Nếu lỗi → rollback về snapshot trước
│
└── DragOverlay → render floating card theo cursor (rotate 1deg effect)

KanbanColumn (useDroppable)
├── id = ApplicationStatus enum value (e.g. 'SCREENING')
├── isOver → highlight column khi đang drag over
└── Render danh sách ApplicationCard

ApplicationCard (useDraggable)
├── id = application.id
├── isGhost → opacity 30% khi card đang được drag (vị trí gốc)
├── overlay prop → không có setNodeRef/listeners (dùng cho DragOverlay)
└── onClick → mở ApplicationDetailModal
```

**Optimistic update pattern:** State thay đổi ngay lập tức khi user thả card. API call chạy async ở background. Nếu API lỗi → rollback state về snapshot trước + toast error. Đây là pattern chuẩn cho Kanban UX — người dùng không cần chờ network.

### ApplicationDetailModal

```
Mở → fetch parallel:
  ├── GET /applications/:id  → full detail (parsedJd, coverLetters, resume)
  └── GET /resumes           → danh sách CV để user chọn

Parsed Requirements section:
  ├── Nếu parsedJd null → button "Parse JD"
  ├── POST /applications/:id/parse-jd → update local state
  └── Hiển thị: seniority, key requirements, skill badges (red = required, gray = nice-to-have)

Cover Letter section:
  ├── Resume dropdown (chọn CV nào dùng)
  ├── EN/VI language toggle
  ├── Button "Generate" / "Regenerate"
  ├── POST /applications/:id/cover-letter
  ├── Editable textarea (AI output là draft, user chỉnh trước khi gửi)
  └── Copy to clipboard button
```

**Tại sao generate cover letter là explicit action, không auto?** AI call tốn tiền và mất ~3s. Người dùng thường batch-log nhiều applications trước, rồi mới generate cover letter từng cái khi thực sự cần. Auto-trigger sẽ lãng phí.

---

## Luồng dữ liệu chính

### Luồng 1: Thêm application mới

```
User nhập form (AddApplicationDialog)
  → POST /api/applications { companyName, jobTitle, jobDescription, ... }
  → Backend: findOrCreate(company) → save JobApplication
  → Frontend: nhận response → prepend vào groups.APPLIED
  → Card xuất hiện ngay trên Kanban (không cần refresh)
  → Dialog đóng
```

### Luồng 2: Drag card sang cột khác

```
User kéo card
  → onDragEnd: active.id (appId), over.id (newStatus)
  → Optimistic: state update ngay
  → Async: PATCH /applications/:id/status { status: newStatus }
  → Nếu thành công: state giữ nguyên
  → Nếu lỗi: rollback + toast.error
```

### Luồng 3: Parse JD + Generate Cover Letter

```
User click card → ApplicationDetailModal mở
  → Fetch detail + resumes list (parallel)
  → User click "Parse JD"
      → POST /applications/:id/parse-jd
      → Gemini phân tích JD → trả về JSON { requiredSkills, keyRequirements, ... }
      → Hiển thị kết quả trong modal
  → User click "Generate Cover Letter"
      → POST /applications/:id/cover-letter { resumeId, language }
      → Backend lấy resume.extractedText + app.jobDescription + parsedJd.keyRequirements
      → Gemini sinh cover letter theo style template đã lock
      → Trả về plain text
      → Frontend hiển thị trong editable textarea
      → User chỉnh sửa → Copy to clipboard → paste vào form ứng tuyển
```

---

## API Reference

> Base URL: `http://localhost:4000/api` | Swagger: `http://localhost:4000/api/docs`

Tất cả endpoint (trừ `/auth/register` và `/auth/login`) đều yêu cầu header:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Path | Body | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | `{ email, name, password }` | Đăng ký + trả về JWT |
| POST | `/auth/login` | `{ email, password }` | Đăng nhập + trả về JWT |
| GET | `/auth/me` | — | Lấy thông tin user hiện tại |

### Resumes

| Method | Path | Body | Mô tả |
|---|---|---|---|
| POST | `/resumes` | `multipart: { file, label }` | Upload CV (PDF/DOCX, max 5MB) |
| GET | `/resumes` | — | Danh sách CV (không có extractedText) |
| GET | `/resumes/:id` | — | Chi tiết 1 CV (có extractedText) |
| PATCH | `/resumes/:id/default` | — | Đặt làm CV mặc định |
| DELETE | `/resumes/:id` | — | Xóa CV + file trên disk |

### Companies

| Method | Path | Query | Mô tả |
|---|---|---|---|
| GET | `/companies/search` | `?q=string` | Tìm kiếm công ty (autocomplete, max 10 kết quả) |

### Applications

| Method | Path | Body / Query | Mô tả |
|---|---|---|---|
| POST | `/applications` | `{ companyName, jobTitle, jobDescription, sourceUrl?, resumeId? }` | Tạo application |
| GET | `/applications` | `?status=APPLIED` (optional) | Danh sách (tóm tắt, không có JD text) |
| GET | `/applications/kanban` | — | Grouped by status → dùng cho Kanban initial load |
| GET | `/applications/:id` | — | Chi tiết đầy đủ (parsedJd + coverLetters) |
| PATCH | `/applications/:id/status` | `{ status }` | Chỉ update status — lightweight, dùng cho drag-drop |
| PATCH | `/applications/:id` | `{ jobTitle?, jobDescription?, sourceUrl?, resumeId? }` | Update thông tin |
| DELETE | `/applications/:id` | — | Xóa application |
| POST | `/applications/:id/parse-jd` | — | Trigger AI parse JD (upsert) |
| POST | `/applications/:id/cover-letter` | `{ resumeId, language?, maxLength? }` | Sinh cover letter |

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

Sau đó thêm API keys vào `apps/backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: dùng OpenAI thay vì Gemini
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Khởi động database

```bash
pnpm db:up
```

### 4. Khởi động backend

```bash
pnpm --filter=backend dev
```

Chờ đến khi thấy `Nest application successfully started`. TypeORM tự động tạo/sync schema.

### 5. Khởi động frontend

```bash
pnpm --filter=frontend dev
```

### Hoặc khởi động tất cả cùng lúc

```bash
pnpm db:up && pnpm dev
```

**URLs:**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api |
| Swagger Docs | http://localhost:4000/api/docs |
| pgAdmin | http://localhost:5050 (email: admin@admin.com / pass: admin) |

---

## Biến môi trường

### `apps/backend/.env`

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `4000` | Port backend |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | DB username |
| `DB_PASSWORD` | `postgres` | DB password |
| `DB_NAME` | `fullstack_db` | Tên database |
| `JWT_SECRET` | *(xem .env.example)* | Secret key JWT — đổi ở production |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn token |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `GEMINI_API_KEY` | — | **Bắt buộc** để dùng AI features |
| `AI_PROVIDER` | `gemini` | `gemini` hoặc `openai` |
| `OPENAI_API_KEY` | — | Chỉ cần nếu `AI_PROVIDER=openai` |

### `apps/frontend/.env.local` (optional)

| Biến | Mặc định | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Backend API URL |

---

## Lưu ý

- **TypeORM `synchronize: true`** chỉ dùng ở development — schema tự đồng bộ với entity. Production phải dùng migrations.
- **CV files** lưu tại `apps/backend/uploads/resumes/` (gitignored) — production nên dùng S3-compatible storage.
- **AI không tự động chạy** khi tạo application — JD parsing và cover letter generation đều là explicit user action để tránh tốn API quota không cần thiết.
