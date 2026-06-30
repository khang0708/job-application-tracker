# Fullstack App

Next.js 14 + NestJS + PostgreSQL monorepo.

## Yêu cầu

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Cài đặt

```bash
pnpm install
```

---

## Cấu hình môi trường

Tạo file `.env` cho backend từ file mẫu:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Các biến môi trường mặc định trong `.env`:

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `4000` | Port của backend |
| `DB_HOST` | `localhost` | Host PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_USERNAME` | `postgres` | Username DB |
| `DB_PASSWORD` | `postgres` | Password DB |
| `DB_NAME` | `fullstack_db` | Tên database |
| `JWT_SECRET` | *(xem file)* | Secret key cho JWT |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn token |
| `FRONTEND_URL` | `http://localhost:3000` | URL frontend (CORS) |

---

## Khởi động

### 1. Khởi động database (Docker)

Đảm bảo Docker Desktop đang chạy, sau đó:

```bash
pnpm db:up
```

Lệnh này khởi động container PostgreSQL trên port `5432`. Để dừng:

```bash
pnpm db:down
```

### 2. Khởi động backend

```bash
pnpm --filter=backend dev
```

Backend chạy tại **http://localhost:4000**

- API: `http://localhost:4000/api`
- Swagger docs: `http://localhost:4000/api/docs`

### 3. Khởi động frontend

```bash
pnpm --filter=frontend dev
```

Frontend chạy tại **http://localhost:3000**

---

## Khởi động tất cả cùng lúc

Sau khi đã chạy `pnpm db:up`, chạy lệnh sau để khởi động cả frontend và backend song song:

```bash
pnpm dev
```

---

## Database migrations

```bash
# Chạy migration
pnpm db:migrate

# Tạo migration mới (chạy từ thư mục apps/backend)
pnpm --filter=backend migration:generate

# Rollback migration gần nhất
pnpm --filter=backend migration:revert

# Seed dữ liệu mẫu
pnpm db:seed
```

> **Lưu ý:** Ở môi trường development, schema tự động đồng bộ với entity (`synchronize: true`). Không dùng tính năng này ở production.

---

## Build production

```bash
pnpm build
```

---

## Lint

```bash
pnpm lint
```

---

## Chạy test

```bash
pnpm --filter=backend test
```

---

## Cấu trúc thư mục

```
fullstack-app/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/     # Module xác thực (JWT)
│   │   │   └── users/    # Module người dùng
│   │   └── .env          # Biến môi trường (tạo từ .env.example)
│   └── frontend/         # Next.js 14 (App Router)
│       └── src/
│           ├── app/      # Pages & layouts
│           ├── lib/      # axios instance
│           └── store/    # Zustand auth store
├── docker-compose.yml    # PostgreSQL + pgAdmin
├── package.json
└── pnpm-workspace.yaml
```

---

## pgAdmin (tuỳ chọn)

Để quản lý database qua giao diện web:

```bash
docker-compose up -d pgadmin
```

Truy cập **http://localhost:5050** với:
- Email: `admin@admin.com`
- Password: `admin`
