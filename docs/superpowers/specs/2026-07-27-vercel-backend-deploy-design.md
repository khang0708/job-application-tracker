# Deploy Backend to Vercel — Design Spec

**Date:** 2026-07-27
**Status:** Approved by user, pending implementation plan

## Mục tiêu

Đưa NestJS backend (job application tracker) lên Vercel Functions, làm giai đoạn 2 sau khi frontend đã deploy thành công (giai đoạn 1, spec riêng: `2026-07-23-vercel-frontend-deploy-design.md`). Vì Vercel Functions là serverless (stateless, filesystem ephemeral, không có persistent connection tới localhost), backend hiện tại cần 4 thay đổi kiến trúc thực sự trước khi deploy được: adapter serverless cho NestJS, database provider hosted, file storage cloud, và loại bỏ OCR fallback dựa trên native binary (`canvas`/`tesseract.js`).

## Ngoài phạm vi (out of scope)

- Không tự động chạy `synchronize: true` trên production — bắt buộc dùng migration.
- Không thêm Anthropic làm provider lựa chọn được trong AI Settings UI (user-facing) — Claude chỉ dùng nội bộ cho OCR fallback, hardcode model, không qua cơ chế `resolveCompleter`/`UserAiConfig`.
- Không migrate dữ liệu cũ từ disk local sang Blob (dự án demo/cá nhân, chấp nhận `fileUrl` cũ không đọc được sau khi đổi ý nghĩa cột).
- Không tối ưu cold-start hay connection pooling nâng cao ngoài việc dùng đúng pooled connection string của Neon.

## Kiến trúc

### 1. Serverless adapter cho NestJS

Tách bootstrap logic hiện có trong `main.ts` (global prefix, CORS, ValidationPipe, Swagger) thành 1 hàm dùng chung `createApp()`, dùng lại ở 2 nơi:

```
apps/backend/src/create-app.ts   — hàm dùng chung, trả về NestExpressApplication đã cấu hình
apps/backend/src/main.ts          — dùng create-app.ts, gọi app.listen() (dev local, không đổi hành vi)
apps/backend/api/index.ts         — entrypoint Vercel: dùng create-app.ts, cache app instance
                                     giữa các lần gọi (tránh khởi tạo lại mỗi request), export Express handler
apps/backend/vercel.json          — rewrite mọi request vào api/index.ts
```

### 2. Database — Vercel Postgres (Neon)

- Đổi cấu hình TypeORM trong `app.module.ts` từ đọc `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME` riêng lẻ sang đọc 1 biến `DATABASE_URL` (chuẩn Neon/Vercel Postgres), giữ fallback đọc biến rời cho dev local.
- Dùng connection string **pooled** (PgBouncer) của Neon — bắt buộc vì mỗi Vercel Function instance mở connection riêng.
- **Migration:** dự án hiện chưa có migration nào, hoàn toàn dựa vào `synchronize: true` (đã đúng đắn bị tắt khi `NODE_ENV=production`). Cần:
  1. Tạo `apps/backend/src/data-source.ts` — TypeORM DataSource config để CLI migration chạy được.
  2. Generate 1 migration khởi tạo phản ánh toàn bộ entity hiện có (bao gồm cả n8n integration entities).
  3. Chạy migration đó nhắm vào Neon **trước** lần deploy production đầu tiên (chạy 1 lần thủ công từ máy local).

### 3. File Storage — Vercel Blob

`StorageService` abstraction, 2 implementation chọn qua biến env `STORAGE_DRIVER` (mặc định `local`):

```
apps/backend/src/storage/storage.service.ts        — interface: save/read/delete
apps/backend/src/storage/local-storage.service.ts  — dùng fs (dev local, hành vi hiện tại)
apps/backend/src/storage/blob-storage.service.ts    — dùng @vercel/blob (production)
```

3 điểm sửa (đã xác nhận qua code, không còn chỗ nào khác dùng `fileUrl`/disk):
- `resumes.controller.ts` — multer `memoryStorage()` thay vì `diskStorage()`, gọi `StorageService.save()`.
- `resumes.service.ts` — `create()`/`remove()` gọi `StorageService.save()`/`.delete()`.
- `applications.service.ts` (`matchCv`, dòng 165-167) — gọi `StorageService.read()` thay vì `fs.readFileSync`.

`Resume.fileUrl` giữ nguyên tên cột, đổi ý nghĩa từ "đường dẫn disk" thành "blob URL/key".

### 4. OCR fallback → Claude Haiku 4.5 (thay tesseract + canvas)

**Vấn đề:** `pdf-ocr.ts` dùng `canvas` (native binary, rủi ro build fail trên Vercel) + `tesseract.js` (tải training data lúc chạy) để OCR ảnh render từ PDF.

**Giải pháp:** Claude hỗ trợ đọc PDF trực tiếp qua Messages API (content block `type: "document"`, `source: {type: "base64", media_type: "application/pdf", data}`) — không cần render trang thành ảnh, không cần canvas.

```
apps/backend/src/resumes/pdf-claude-extract.ts   — hàm mới: gửi PDF buffer (base64) lên Claude Haiku 4.5, nhận về text thuần
```

- Model: `claude-haiku-4-5` — rẻ nhất trong dòng model hiện tại ($1/$5 per MTok), đủ dùng cho tác vụ trích xuất text đơn thuần (không cần suy luận phức tạp). Context window 200K giới hạn tối đa 100 trang PDF/request — không ảnh hưởng vì CV chỉ 1-4 trang.
- Thêm dependency `@anthropic-ai/sdk`, biến env `ANTHROPIC_API_KEY` (global, không qua cơ chế `UserAiConfig` — đây là fallback nội bộ, không phải provider người dùng chọn).
- `resumes.service.ts`: thay lời gọi `extractPdfTextWithOcr(fileBuffer)` bằng lời gọi hàm mới.
- **Xóa khỏi production path:** `pdf-ocr.ts`, gỡ 3 dependency `canvas`/`tesseract.js`/`pdfjs-dist` khỏi `apps/backend/package.json`, gỡ `pnpm.overrides.canvas` ở root `package.json`, xóa `eng.traineddata`/`vie.traineddata`.

## Cấu hình môi trường + Vercel setup

**Biến môi trường mới trên Vercel (project backend):**

| Biến | Giá trị | Ghi chú |
|---|---|---|
| `DATABASE_URL` | connection string pooled từ Neon | Thay `DB_HOST/DB_PORT/...` khi production |
| `BLOB_READ_WRITE_TOKEN` | tự động có khi link Vercel Blob store | Dùng bởi `@vercel/blob` SDK |
| `ANTHROPIC_API_KEY` | key Anthropic | Cho OCR fallback |
| `STORAGE_DRIVER` | `blob` | Ép dùng Vercel Blob thay vì disk local |

Các biến hiện có (`GEMINI_API_KEY`, `JWT_SECRET`, `FRONTEND_URL`, `NEXT_PUBLIC_API_URL`...) giữ nguyên.

**Cấu trúc Vercel project cho backend** (project thứ 2, tách biệt với frontend đã deploy ở giai đoạn 1):

```
Root Directory: apps/backend
vercel.json:
{
  "rewrites": [{ "source": "/(.*)", "destination": "/api" }]
}
```

**Thứ tự thực hiện (khi triển khai thực tế, ngoài phạm vi spec này):**
1. Tạo Neon Postgres qua Vercel Storage tab → lấy `DATABASE_URL`.
2. Tạo Vercel Blob store → lấy `BLOB_READ_WRITE_TOKEN`.
3. Code: `StorageService` abstraction + serverless adapter + swap DB config + Claude OCR.
4. Generate + chạy migration khởi tạo nhắm vào Neon (1 lần, thủ công, trước deploy đầu tiên).
5. Deploy preview → test các luồng chính (login, upload CV, parse JD, n8n webhook) → xác nhận rõ ràng trước khi promote production.

## Error handling

- `StorageService` (mọi implementation) throw lỗi rõ ràng nếu thiếu config (vd Blob token) — không để lỗi mơ hồ dạng "file not found".
- Claude OCR fallback: nếu `ANTHROPIC_API_KEY` thiếu → trả lỗi theo đúng pattern hiện có ("Không thể đọc nội dung CV...") thay vì crash không rõ nguyên nhân.
- Serverless handler (`api/index.ts`): bọc try/catch quanh việc khởi tạo Nest app — nếu init lỗi (vd không kết nối được DB) → trả 500 rõ ràng thay vì timeout im lặng.

## Testing plan

- Unit test `StorageService` (local + blob implementation) — mock `@vercel/blob` SDK.
- Unit test hàm extract text mới dùng Claude — mock `@anthropic-ai/sdk` response, theo đúng pattern test hiện có cho `AiService.classifyEmail` (mock provider, verify parse output).
- Test migration: chạy `migration:run` trên DB test trống, verify schema tạo đúng (đối chiếu với schema hiện có từ `synchronize: true`).
- Manual verification sau deploy: đăng ký/đăng nhập, upload CV (PDF thường + PDF scan để test OCR fallback), tạo application, parse JD, gọi thử webhook n8n — nhắm vào Neon + Blob thật thay vì Docker Postgres + disk local.
