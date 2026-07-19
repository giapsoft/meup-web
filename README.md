# meup-web

Web quản lý từ vựng cho thiết bị [MeUp](https://github.com/giapsoft/meup) — responsive mobile & desktop.

Hiện tại chỉ có **mockup trang chủ** (chưa auth, chưa API).

## Chạy local (npm trên máy)

```bash
npm install
npm run dev
```

Mở http://localhost:8086 — cần `meup-api` đang chạy ở `:8082` (Vite proxy `/api`). Docker web vẫn `:8082`.

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
| web | http://localhost:8082 |
| api | http://localhost:8080 |
| postgres | `localhost:5432` (`postgres` / `postgres` / `meup_db`) |

Sửa code trong `meup-web` trên host — Vite HMR trong container. Dừng: `Ctrl+C` hoặc `docker compose down`.

## Build

```bash
npm run build
npm run preview
```

## Device link (QR)

Firmware mở web bằng path (không còn `order-mac` cũ):

```
https://<web>/[study?][native?][deviceOrder][tempHash6]
```

| Ví dụ path | study | native (web) | redeem API |
|---|---|---|---|
| `/101kehj` | *(thiếu → màn chọn Study)* | `vi` | `1-01kehj` |
| `/en101kehj` | `en` | `vi` (omit trên path) | `1-01kehj` |
| `/enth1002-nkl` | `en` | `th` | `10-02-nkl` |

**Thứ tự lang trên path = Study → Native** (ngoại lệ; chỗ khác trong codebase là Native → Study).

- `native == vi` trên máy → **không** ghi vào URL; web fallback `vi`.
- Mỗi lần mở path QR hợp lệ → **ép** lang theo QR (kể cả đã đăng nhập).
- Web gọi `POST /api/device/link/redeem` với `"<deviceOrder>-<tempHash>"`.

Query cũ `?nativeLangCode=&studyLangCode=&authCode=` vẫn dùng được cho login/dev thủ công (không phải path QR).

Dev URL mẫu (path):

```
http://localhost:8086/en101kehj
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
