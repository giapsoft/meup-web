# tach-web

Web quản lý từ vựng cho thiết bị [Tach](https://github.com/giapsoft/tach) — responsive mobile & desktop.

Hiện tại chỉ có **mockup trang chủ** (chưa auth, chưa API).

## Chạy local

```bash
npm install
npm run dev
```

Mở http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Trang chủ (mockup)

- Chọn **ngôn ngữ nguồn** và **ngôn ngữ học**
- **Chương trình của tôi** → `/programs`
- **Tạo chương trình mới** → `/programs/new`
- **Khám phá chương trình** → `/explore`
- Header: **credit** thiết bị (mock) + **Đăng xuất**

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router

## Liên quan

- `tach` — firmware ESP32
- `capygo-api` — backend từ vựng / worker
