# API ↔ Web UI — tra cứu tiến độ

So sánh `meup-api` (`../meup-api`) với `meup-web`. Cập nhật: 2026-07-05.

## Chú thích trạng thái

| Trạng thái | Ý nghĩa |
|------------|---------|
| ✅ | Web đã có giao diện / luồng người dùng tương ứng |
| ❌ | API dành cho web nhưng **chưa** có giao diện |
| 🚫 bỏ qua | Cố ý không làm UI web (đã quyết định, ghi ngày) |
| ⏭️ | Không cần giao diện web (device, webhook, admin secret, health) |
| ⚠️ | Có API client nhưng thiếu UI hoàn chỉnh |
| 📋 sau | Thuộc phạm vi dự án nhưng làm sau các mục seller |

---

## Hệ thống

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| GET | `/` | ⏭️ | Health text |
| GET | `/healthz` | ⏭️ | Health check |

---

## Auth — `/api/auth`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| POST | `/api/auth/refresh` | ✅ | `src/api/client.ts`, token rotation |
| POST | `/api/auth/register` | ✅ | `src/pages/auth/AuthPages.tsx` |
| POST | `/api/auth/login` | ✅ | `src/pages/auth/AuthPages.tsx` |
| POST | `/api/auth/google` | ✅ | `GoogleSignInButton` — Sign In With Google |
| POST | `/api/auth/verify-email` | ✅ | `src/pages/auth/VerifyEmailPage.tsx` |
| GET | `/api/auth/me` | ✅ | `AccountProvider`, header credits |
| PATCH | `/api/auth/me` | ✅ | `LanguagePairProvider` — cập nhật lang prefs |
| POST | `/api/auth/verify-email/resend` | ✅ | `VerifyEmailBanner` |

---

## Device — `/api/device`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| POST | `/api/device/link/redeem` | ✅ | QR login — `DeviceSessionProvider` |
| POST | `/api/device/verify-link` | ⏭️ | Mock legacy; web dùng redeem |
| POST | `/api/device/register_device` | ⏭️ | Firmware factory |
| POST | `/api/device/rotate_temp_id/init` | ⏭️ | Device handshake |
| POST | `/api/device/rotate_temp_id/confirm` | ⏭️ | Device handshake |
| POST | `/api/device/server-app` | ⏭️ | `X-Device-Auth` — device catalog sync |
| POST | `/api/device/package-link/download` | ⏭️ | Bản device của download link |

---

## Payment — `/api/payment`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| POST | `/api/payment/{provider}/webhook` | ⏭️ | Server-to-server; không có API public list gói nạp cho user |

---

## Product — `/api/product`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| GET | `/api/product/purchased` | ✅ | `ProductsPage` tab Purchased |
| GET | `/api/product/owned` | ✅ | `ProductsPage` tab Owned |
| GET | `/api/product/shares` | ✅ | `ProductShareModal` |
| GET | `/api/product/catalog` | ✅ | `ExplorePage` |
| GET | `/api/product/device-programs` | ✅ | `ProductsPage` tab Shared |
| POST | `/api/product/purchase` | ✅ | `ExplorePage` |
| POST | `/api/product/share` | ✅ | `ProductShareModal` |
| POST | `/api/product/unshare` | ✅ | `ProductShareModal` |
| PATCH | `/api/product/settings` | ✅ | `ProductSettingsModal` |
| POST | `/api/product/export-version` | ✅ | `EditProgramPage` publish |
| GET | `/api/product/draft` | ✅ | `EditProgramPage` |
| POST | `/api/product/draft` | ✅ | `EditProgramPage` autosave |
| GET | `/api/product/import-package` | ✅ | `EditProgramPage` load published |
| POST | `/api/product/restore-version` | 🚫 bỏ qua | Chưa làm UI — không có API list version; **tạm bỏ qua theo quyết định 2026-07-01** |
| POST | `/api/product/package-link/download` | 🚫 bỏ qua | Chưa làm UI — **tạm bỏ qua theo quyết định 2026-07-01** (web chủ yếu sync qua device) |

---

## Web config — `/api/web-config`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| GET | `/api/web-config` | ✅ | `src/app/App.ts` + `src/api/webConfig.ts` — cache giá/limits/defaultConfig |

---

## Product create media (instant) — `/api/product-create/*`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| POST | `/api/product-create/generate-audio` | ✅ | `MediaPickerDialog` (Phase 5) |
| POST | `/api/product-create/generate-image` | ✅ | `MediaPickerDialog` (Phase 5) |
| POST | `/api/product-create/generate-description` | ⚠️ | `CustomConfigDialog` ✅; AI create dùng dialog (Phase 4) |
| POST | `/api/product-create/upload-audio` | ✅ | `MediaPickerDialog` upload (Phase 5) |
| POST | `/api/product-create/upload-image` | ✅ | `MediaPickerDialog` upload (Phase 5) |
| POST | `/api/product-create/cancel-manual` | ✅ | `VocabEntryDialog` cancel + page cleanup (Phase 5) |

---

## Product create — `/api/product-create`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| POST | `/api/product-create` | ⚠️ | Body v2 ✅; AI + manual create ✅ (Phase 4–5); legacy wizard file còn Phase 6 |
| GET | `/api/product-create` | ✅ | `ProductsPage` tab Requests |
| GET | `/api/product-create/{requestId}/progress` | ✅ | `ProductsPage` — refresh progress |
| POST | `/api/product-create/{requestId}/jobs/{jobId}/retry` | ❌ | **#3** — cần `jobId`; list/progress API không trả danh sách job |

---

## Seller payout (seller) — `/api/seller-payout`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| GET | `/api/seller-payout/sales` | ✅ | `SellerPage` tab Sales — `/seller` |
| GET | `/api/seller-payout/history` | ✅ | `SellerPage` tab Payout history |

---

## Admin — `/api/admin`

| Method | Path | Web UI | Ghi chú |
|--------|------|--------|---------|
| GET | `/api/admin/seller-payout/balances` | ✅ | `AdminPanelPage` tab Seller balances — `/admin` |
| POST | `/api/admin/seller-payout/record` | ✅ | `AdminPanelPage` tab Record payout |
| PUT | `/api/admin/credit-packages` | ✅ | `AdminPanelPage` tab Credit packages |

---

## Hàng đợi triển khai (web user-facing)

| # | API | Trạng thái UI | Blocker / ghi chú |
|---|-----|---------------|-------------------|
| 1 | `POST /api/product/restore-version` | 🚫 bỏ qua | Không có API list version — **bỏ qua 2026-07-01** |
| 2 | `POST /api/product/package-link/download` | 🚫 bỏ qua | **Bỏ qua 2026-07-01** |
| 3 | `POST /api/product-create/.../retry` | ❌ chưa làm | List/progress không trả `jobId` — cần quyết trước khi làm UI |
| 4 | `GET /api/seller-payout/sales` | ✅ xong | `src/pages/SellerPage.tsx` — 2026-07-01 |
| 5 | `GET /api/seller-payout/history` | ✅ xong | Gộp `SellerPage` — 2026-07-01 |
| 6–8 | `/api/admin/*` (3 endpoint) | ✅ xong | `/admin` + `X-Admin-Secret` — 2026-07-01 |

---

## Tóm tắt

- **Đã có UI:** auth, redeem QR, web-config cache, product marketplace (owned/purchased/shared/catalog/purchase/share/settings/edit/export/draft), product-create v2 client + list/progress.
- **Thiếu UI (web, còn làm):** legacy wizard cleanup (Phase 6), retry job (#3).
- **Admin UI:** `/admin` (gate) → `/admin/panel` (3 tab).
- **Bỏ qua (web):** restore-version, package-link/download.
- **Không cần UI web:** device handshake, payment webhook, health.
