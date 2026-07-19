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
- Web **không** cho user chọn native — chỉ chọn **ngôn ngữ học (study)** trên UI.
- Mỗi lần mở path QR hợp lệ → **ép** lang theo QR (kể cả đã đăng nhập).
- Web gọi `POST /api/device/link/redeem` với `"<deviceOrder>-<tempHash>"`.

Query cũ `?nativeLangCode=&studyLangCode=&authCode=` vẫn dùng được cho login/dev thủ công (không phải path QR).

Dev URL mẫu (path):

```
http://localhost:8086/en101kehj
```

## Trang chủ

- Chọn **ngôn ngữ học** trên chip header (tên ngôn ngữ); native lấy từ QR / account / session / mặc định `vi`
- **Chương trình của tôi** → `/products`
- **Tạo chương trình mới** → `/products/new`
- **Khám phá chương trình** → `/explore`
- Header: **credit** + chip ngôn ngữ học + **Đăng xuất**

## i18n

```
src/locales/     vi, en, ja, ko, zh, fr, de
src/i18n/        types, messages (fallback en)
src/context/     LanguagePairProvider — nativeLang (read-only) → uiLocale; user chỉ đổi studyLang
```

Trong component: `const { t, studyLang, setStudyLang } = useLanguagePair()` rồi `t('home.title')`.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router

## Liên quan

- `meup` — firmware ESP32
- `capygo-api` — backend từ vựng / worker
