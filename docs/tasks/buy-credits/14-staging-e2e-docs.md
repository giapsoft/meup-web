# 14 — Staging E2E + gap docs

**Repo:** cả hai  
**Phụ thuộc:** 01–13  
**Plan:** Phase C / §10

## Việc cần làm

1. Env staging + 2 key gói đúng giá.
2. CK SePay thật → dialog success.
3. Cập nhật `API_UI_GAP.md`, UX D9, plan status shipped.
4. Optional: link từ insufficient_credits → `/credits`.

## Docs (code agent) — done

- [x] `docs/API_UI_GAP.md` — payment/credits + admin packages/system-config
- [x] `docs/UX_SCREEN_LAYOUT_PLAN.md` — `/credits`, D9/D10, P5
- [x] `docs/PLAN_BUY_CREDITS.md` — status **Shipped (code)**
- [x] Explore `insufficient_credits` → link `/credits` (đã có từ task 13 polish)

## Staging E2E (ops — cần môi trường thật)

Không chạy được từ agent local nếu không có staging SePay + bank. Checklist:

### A. Env API staging

- [ ] Migration `credit_checkout` + drop FK đã apply
- [ ] `PAYMENT_DEFAULT_PROVIDER=sepay`
- [ ] `PAYMENT_BANK_ACCOUNT_NO` / `PAYMENT_BANK_CODE` / `PAYMENT_BANK_NAME` / `PAYMENT_ACCOUNT_HOLDER`
- [ ] `PAYMENT_QR_TEMPLATE` (nếu dùng)
- [ ] `SEPAY_NOTIFY_API_KEY` (hoặc `SEPAY_NOTIFY_API_KEYS`) khớp webhook SePay
- [ ] `SEPAY_ACCOUNT_NUMBER(S)` allowlist khớp TK nhận
- [ ] `ALLOW_FAKE_PAYMENT_PROVIDER=false` trên staging (trừ khi cố ý test fake)

### B. Catalog

- [ ] Admin → Packages: `CREDIT_PACKAGE_MONTHLY` / `_YEARLY` đúng `priceVnd` / `amount` / `active`
- [ ] User `/credits` thấy 2 gói khớp (sau cache TTL nếu vừa sửa)

### C. Giao dịch thật

1. Đăng nhập web staging → tap credits → `/credits`
2. Chọn gói (nên **monthly** số tiền nhỏ hơn) → dialog hiện QR + nội dung `MEUP_{muserId}_{packageId}`
3. CK đúng **số tiền** + **nội dung** từ dialog
4. Dialog poll → **Nạp thành công**; balance Header tăng
5. (Phụ) CK sai amount → không fulfill; balance không đổi

### Done khi

- [ ] ≥1 giao dịch staging thành công (ops tick ở đây + ghi ngày / checkoutId nếu cần)

## Local smoke (không thay staging)

```text
ALLOW_FAKE_PAYMENT_PROVIDER=true
→ /credits → chọn gói → (fallback fake nếu thiếu PAYMENT_BANK_*)
→ Simulate payment → success
```

Postman: `meup-api` collection folder **Payment** (xem `meup-api/docs/POSTMAN.md` §7.2).
