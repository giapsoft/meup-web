# meup-web

Web quản lý từ vựng cho thiết bị [MeUp](https://github.com/giapsoft/meup) — responsive mobile & desktop.

Hiện tại chỉ có **mockup trang chủ** (chưa auth, chưa API).

## Chạy local (npm trên máy)

```bash
npm install
npm run dev
```

Mở http://localhost:5173 — cần `meup-api` đang chạy ở `:8080` (Vite proxy `/api`).

## Chạy full stack bằng Docker

Web + API + PostgreSQL nằm **cùng nhóm Compose** với `meup-api`. Repo `meup-web` phải nằm cạnh `meup-api`:

```
gits/
  meup-api/
  meup-web/
```

Từ thư mục `meup-api`:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| web | http://localhost:5173 |
| api | http://localhost:8080 |
| postgres | `localhost:5432` (`postgres` / `postgres` / `meup_db`) |

Sửa code trong `meup-web` trên host — Vite HMR trong container. Dừng: `Ctrl+C` hoặc `docker compose down`.

## Build

```bash
npm run build
npm run preview
```

## Device link (QR)

User opens the site from an ESP32 QR code with query parameters:

```
/?nativeLangCode=vi&studyLangCode=en&authCode=meup
```

| Param | Mặc định / fallback |
|-------|---------------------|
| `nativeLangCode` | `vi` — ISO 639-1 (vi, en, ja, zh, …); không dùng mã quốc gia (vn, jp, cn) |
| `studyLangCode` | `en` |
| `authCode` | bắt buộc — mock hợp lệ: `meup` |

Flow:

1. POST mock ` /api/device/verify-link` body `{ authCode }` (console log)
2. Hợp lệ → vào app; không hợp lệ / thiếu `authCode` → trang 404
3. User có thể đổi ngôn ngữ trên UI (session); giá trị ban đầu từ URL
4. **Điều hướng nội bộ:** URL sạch (`/programs`); auth + ngôn ngữ lấy từ `sessionStorage` (F5 cùng tab vẫn ổn)

Dev URL mẫu:

```
http://localhost:5173/?nativeLangCode=vi&studyLangCode=en&authCode=meup
```

## Trang chủ (mockup)

- Chọn **ngôn ngữ nguồn** và **ngôn ngữ học** — ban đầu từ URL QR; giao diện web đổi theo ngôn ngữ nguồn
- **Chương trình của tôi** → `/programs`
- **Tạo chương trình mới** → `/programs/new`
- **Khám phá chương trình** → `/explore`
- Header: **credit** thiết bị (mock) + **Đăng xuất**

## i18n

```
src/locales/     vi, en, ja, ko, zh, fr, de
src/i18n/        types, messages (fallback en)
src/context/     LanguagePairProvider — nativeLang = uiLocale
```

Trong component: `const { t, nativeLang, setNativeLang } = useLanguagePair()` rồi `t('home.title')`.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router

## Liên quan

- `meup` — firmware ESP32
- `capygo-api` — backend từ vựng / worker
