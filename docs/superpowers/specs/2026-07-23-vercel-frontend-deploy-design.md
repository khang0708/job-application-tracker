# Deploy Frontend to Vercel — Design Spec

**Date:** 2026-07-23
**Status:** Approved by user, pending implementation plan

## Mục tiêu

Deploy `apps/frontend` (Next.js 14 App Router) lên Vercel như một dự án độc lập trong monorepo pnpm, để có 1 URL live phục vụ demo/kiểm tra UI. Đây là giai đoạn 1 trong 2 giai đoạn deploy — giai đoạn 2 (đưa NestJS backend + PostgreSQL lên Vercel) là một sub-project riêng, được brainstorm và lập kế hoạch tách biệt vì phức tạp hơn nhiều (cần thay đổi kiến trúc: file storage, DB provider, serverless adapter cho NestJS, rủi ro với native deps như `canvas`/`tesseract.js`).

## Ngoài phạm vi (out of scope)

- Backend chưa được deploy ở giai đoạn này — `NEXT_PUBLIC_API_URL` sẽ trỏ tới giá trị placeholder, các lời gọi API từ frontend sẽ lỗi cho tới khi backend có URL thật.
- Không sửa code trừ khi build preview trên Vercel phát hiện lỗi cụ thể liên quan đến cấu trúc monorepo.
- Không thiết kế/triển khai backend migration — đó là spec riêng, làm sau.

## Kiến trúc

Vercel có hỗ trợ sẵn cho pnpm workspace monorepo: tạo 1 Vercel project trỏ Root Directory vào `apps/frontend`; Vercel tự chạy `pnpm install` ở root repo (do phát hiện `pnpm-workspace.yaml`) rồi build đúng app con bằng framework preset Next.js tự động nhận diện.

```
Vercel project (Root Directory = apps/frontend)
  → pnpm install (chạy ở root, theo pnpm-workspace.yaml)
  → next build (trong apps/frontend, framework preset auto-detect)
  → Preview deployment URL
```

## Các bước triển khai

1. Cài Vercel CLI toàn cục nếu chưa có (`npm i -g vercel`), đăng nhập (`vercel login`).
2. Link project: chạy `vercel link` với Root Directory = `apps/frontend` (tạo `.vercel/project.json`).
3. Set biến môi trường trên Vercel: `NEXT_PUBLIC_API_URL` = giá trị placeholder rõ ràng (vd `https://backend-not-deployed-yet.example.com/api`) — tài liệu hóa rằng cần cập nhật giá trị này khi backend có URL thật.
4. Deploy preview (`vercel`, không phải `--prod`).
5. Verify: kiểm tra deployment state (READY/ERROR) qua `vercel inspect`; nếu ERROR, lấy build logs qua `vercel logs` và chẩn đoán.
6. Nếu preview build thành công → dừng lại, hỏi user xác nhận rõ ràng trước khi promote production (`vercel --prod`). Không tự ý promote production.

## Error handling

- Nếu preflight phát hiện uncommitted changes (`git status --porcelain` không rỗng) → cảnh báo rằng thay đổi chưa commit sẽ không được đưa vào bản deploy, hỏi tiếp tục hay commit trước.
- Nếu build lỗi do vấn đề cấu trúc monorepo (vd Vercel không nhận diện đúng `pnpm-workspace.yaml` hoặc Root Directory) → báo cáo lỗi cụ thể từ build logs, đề xuất fix (thường là chỉnh lại Root Directory trong Vercel project settings), không tự ý sửa code nếu chưa rõ nguyên nhân.
- Nếu `NEXT_PUBLIC_API_URL` chưa được set trước khi deploy → build vẫn thành công (đây là biến runtime/build-time đọc qua `process.env`, có giá trị fallback `http://localhost:4000/api` trong code — xem `apps/frontend/src/lib/api.ts`), nhưng mọi lời gọi API trên bản deploy sẽ fail cho tới khi set đúng giá trị.

## Testing/verification

Dùng preflight + verification steps có sẵn trong skill `vercel:deploy` của dự án:
- Preflight: CLI available, project linked, monorepo detection, uncommitted changes check.
- Post-deploy: `vercel inspect <url>` để xem state/build duration/framework; nếu ERROR thì `vercel logs <url>` lấy 50 dòng cuối.
- Không cần test tự động mới — đây là thay đổi hạ tầng/triển khai, không phải code logic.
