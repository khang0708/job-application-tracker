# n8n Email Integration — Design Spec

**Date:** 2026-07-22
**Status:** Approved by user, pending implementation plan

## Mục tiêu

Tự động hóa việc cập nhật trạng thái application dựa trên email thực tế (mời phỏng vấn, từ chối, offer...) mà user nhận được trong hộp thư. Người dùng tự dựng workflow n8n để theo dõi Gmail của họ; workflow này forward nội dung email thô đến backend. Backend dùng AI (tận dụng `AiService` sẵn có) để phân loại email, match với đúng application, và đề xuất status mới. Đề xuất luôn cần user xác nhận thủ công trước khi áp dụng — không tự động đổi status.

## Ngoài phạm vi (out of scope)

- Không tự động đổi status mà không qua xác nhận của user.
- Không lưu lại hay xử lý các email không match được application nào ("unmatched inbox").
- Không dedupe theo message-id ở phiên bản đầu (nếu n8n gửi trùng do retry, chấp nhận suggestion trùng).
- Không cung cấp UI để cấu hình workflow n8n — n8n workflow là trách nhiệm của user, backend chỉ cung cấp webhook + tài liệu mẫu.

## Kiến trúc luồng dữ liệu

```
Gmail (của user)
  → n8n workflow (Gmail Trigger node, user tự cấu hình trong n8n)
  → n8n gọi webhook, kèm API key riêng của user trong header
  → POST /api/integrations/n8n/email-event
       Header: Authorization: Bearer <apiKey>
       Body: { from, subject, body, receivedAt? }
  → Backend:
       1. N8nApiKeyGuard tra apiKeyHash → xác định userId
       2. Load các application đang active của user (loại trừ REJECTED, WITHDRAWN)
       3. AiService.classifyEmail({ emailFrom, emailSubject, emailBody, applications }, userId)
          → prompt mới theo pattern jd-parsing.prompt.ts
          → trả về JSON: { applicationId | null, suggestedStatus | null, confidence, reasoning }
       4. Nếu applicationId null hoặc confidence < 60 → bỏ qua, không lưu gì, trả { matched: false }
       5. Ngược lại → tạo EmailSuggestion (resolutionStatus = PENDING), trả { matched: true, suggestionId }
  → User vào trang "Đề xuất" trong app → Accept (áp dụng status thật) / Dismiss
```

**Vì sao AI phân loại ở backend, không phải ở n8n:** Matching cần query DB (danh sách application của user) — n8n không có quyền truy vấn DB an toàn. Tập trung logic AI ở backend giúp tái dùng `AiService`/`user-ai-config` đã có, dễ test, dễ debug so với logic phân tán trong n8n workflow.

**Vì sao suggestion cần xác nhận, không tự động apply:** AI có thể đoán sai company/status từ nội dung email tự do của nhà tuyển dụng. Cho user xác nhận tránh Kanban board bị sai lệch âm thầm.

## Data model

### `EmailSuggestion` (bảng mới)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| userId | uuid | |
| applicationId | uuid | FK → job_applications |
| suggestedStatus | ApplicationStatus enum | Status AI đề xuất |
| currentStatusSnapshot | ApplicationStatus enum | Status tại thời điểm đề xuất, để hiển thị "A → B" |
| confidence | int | 0-100, từ AI |
| reasoning | text | Giải thích ngắn từ AI, hiển thị cho user |
| emailFrom | varchar | Ngữ cảnh hiển thị |
| emailSubject | varchar | Ngữ cảnh hiển thị |
| resolutionStatus | enum | 'PENDING' \| 'ACCEPTED' \| 'DISMISSED' |
| createdAt | timestamp | |
| resolvedAt | timestamp nullable | |

### `UserN8nConfig` (bảng mới, cùng pattern với `UserAiConfig`)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| userId | uuid unique | |
| apiKeyHash | varchar, indexed | SHA-256 hex của API key — dùng để tra cứu (key vốn random/high-entropy nên fast-hash lookup chấp nhận được, khác với password) |
| apiKeyPrefix | varchar | Ví dụ `n8n_a1b2...`, hiển thị cho user nhận diện, không show lại full key |
| createdAt | timestamp | |

Full API key chỉ hiển thị **một lần** lúc generate/regenerate (giống pattern GitHub/Stripe token).

## API endpoints

Module mới: `apps/backend/src/integrations/n8n/`

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/integrations/n8n/config/regenerate` | JWT | Sinh API key mới, trả full key 1 lần duy nhất |
| GET | `/integrations/n8n/config` | JWT | Trả `{ configured, apiKeyPrefix }` |
| POST | `/integrations/n8n/email-event` | N8nApiKeyGuard | Webhook nhận email thô từ n8n |
| GET | `/integrations/n8n/suggestions?status=PENDING` | JWT | List đề xuất, join application (companyName, jobTitle) |
| POST | `/integrations/n8n/suggestions/:id/accept` | JWT | Update status thật (gọi `ApplicationsService.updateStatus`) + đánh dấu ACCEPTED |
| POST | `/integrations/n8n/suggestions/:id/dismiss` | JWT | Đánh dấu DISMISSED |

`N8nApiKeyGuard`: guard mới, tách biệt với `JwtAuthGuard`, inject `req.userId` sau khi tra `apiKeyHash`.

## Frontend

- Trang mới `dashboard/suggestions/page.tsx` — danh sách card: company, job title, "AI đề xuất chuyển từ X → Y", reasoning, nút Accept/Dismiss.
- Badge số lượng pending trên nav/sidebar, poll qua React Query (giống pattern hiện có).
- Thêm card "Integrations" vào trang cấu hình AI hiện có (hoặc tab riêng) — nút "Generate API Key", copy webhook URL, hướng dẫn ngắn dán vào n8n.

## n8n workflow mẫu (tài liệu, ngoài phạm vi code)

```
Gmail Trigger (poll mailbox)
  → HTTP Request node
       POST https://<backend-url>/api/integrations/n8n/email-event
       Header: Authorization: Bearer <apiKey>
       Body: { from, subject, body, receivedAt }
```

## Error handling & edge cases

- API key sai/thiếu → 401, không tiết lộ lý do cụ thể.
- AI call lỗi (rate limit, thiếu key trong `user-ai-config`) → webhook trả 200, log lỗi nội bộ, không throw 500 (tránh n8n retry loop tạo suggestion trùng lặp do lỗi tạm thời).
- Email trùng do n8n retry → chấp nhận suggestion trùng ở MVP, không dedupe theo message-id.
- Accept suggestion khi application đã bị xóa → 404, suggestion tự ẩn khỏi list.

## Testing plan

- Unit test prompt builder `classifyEmail` (mock AI response, verify JSON parse theo pattern `jd-parsing.prompt`).
- Unit test `N8nApiKeyGuard` (key đúng/sai/thiếu).
- Integration test webhook: mock `AiService`, verify suggestion tạo đúng hoặc bị bỏ qua khi confidence thấp.
- Test accept/dismiss endpoints cập nhật đúng `resolutionStatus` + gọi đúng `ApplicationsService.updateStatus`.
