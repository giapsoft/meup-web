# Kế hoạch: Mua / nạp credits (meup-api + meup-web)

> **Trạng thái:** Draft — 2 key `system_config`: `CREDIT_PACKAGE_MONTHLY` / `CREDIT_PACKAGE_YEARLY`.  
> **Ngày:** 2026-07-18  
> **Phạm vi:** User nạp credits trên meup-web; v1 **bank-transfer QR** qua SePay (+ fake). Payment registry hiện có được tận dụng / mở rộng checkout.  
> **Tham chiếu UX:** `remyset_dolphin` (CapyLala).  
> **Không v1:** Stripe/MoMo implement, seller payout, đổi quy tắc trừ credit AI / Explore.

---

## 1. UX mục tiêu

```text
Click Credits (Header) → luôn /credits
        ↓
2 gói từ config — mỗi gói giải thích đủ (subscription)
        ↓
Chọn gói → Dialog: QR + TK + số tiền + nội dung CK
        ↓
User CK → dialog tự “Nạp thành công” (poll checkout) + refresh balance
```

### 1.1 Hai gói (giá trị mặc định trong config)

| id | term | monthCount | amount (credits/kỳ) | priceVnd | Ý nghĩa |
|----|------|------------|---------------------|----------|---------|
| `monthly` | MONTHLY | 1 | 500 | 50000 | 500 credits / 1 tháng |
| `yearly` | YEARLY | 12 | 700 | 500000 | 700 credits mỗi tháng × 12 tháng |

Đổi amount/giá sau này = sửa `system_config`, không migration schema.

### 1.2 Copy trên UI

Mỗi card: nhãn kỳ, giá VND, credits/tháng, số tháng, **câu giải thích i18n** (không hiểu là nạp vĩnh viễn). Dialog nhắc lại gói đang thanh toán.

---

## 2. Catalog = `system_config` (không bảng gói mới)

### 2.1 Hai key riêng (mỗi gói một config)

| Key | Gói |
|-----|-----|
| `CREDIT_PACKAGE_MONTHLY` | Gói tháng |
| `CREDIT_PACKAGE_YEARLY` | Gói năm |

Kind **json**, chỉnh từng key qua `GET/PUT /api/admin/system-config`.

Shape **một gói** (mỗi key một object, không bọc mảng):

```json
{
  "id": "monthly",
  "name": "Gói tháng",
  "amount": 500,
  "priceVnd": 50000,
  "term": "MONTHLY",
  "monthCount": 1,
  "active": true
}
```

```json
{
  "id": "yearly",
  "name": "Gói năm",
  "amount": 700,
  "priceVnd": 500000,
  "term": "YEARLY",
  "monthCount": 12,
  "active": true
}
```

Validate mỗi key khi upsert: `id` khớp key (`monthly` / `yearly`), `amount > 0`, `priceVnd > 0`, `term` / `monthCount` hợp lệ.

Default khi key trống: giá trị §1.1 trong code.

List packages cho web = đọc cả hai key (bỏ qua `active: false`).

### 2.2 Bảng `credit_package` hiện có — **đã chốt A**

`credit_purchase.credit_package_id` hiện **FK** → `credit_package(id)`.

**A (chốt):** Drop FK; cột còn TEXT audit; **lookup gói chỉ từ `system_config`**. Bảng `credit_package` deprecated (không ghi thêm); có thể drop table ở migration sau nếu muốn.

(Không làm B mirror rows / C hardcode.)

### 2.3 Đổi code lookup

- `LookupPackage` / `PackageAmount` / fulfill path: map `monthly` → `CREDIT_PACKAGE_MONTHLY`, `yearly` → `CREDIT_PACKAGE_YEARLY`.
- Deprecate `PUT /api/admin/credit-packages` + thay tab Admin packages bằng form §8.1.
- Webhook SePay vẫn dùng `MEUP_{muserId}_{packageId}` với `packageId` ∈ {`monthly`,`yearly`}.

---

## 3. Hiện trạng (as-is) — giữ nguyên ý nghĩa

- Webhook SePay/fake → `FulfillPurchase` ✅  
- Transfer content helper ✅  
- `system_config` + admin catalog ✅ (chưa có 2 key gói)  
- Chưa có checkout session / QR instructions / UI `/credits`  
- `credit_package` table + admin sync vẫn đang là SoT (sẽ thay)

---

## 4. Quyết định thiết kế

| # | Chốt |
|---|------|
| Q1 | Provider v1 = `sepay` (+ `fake`); registry hiện có |
| Q2 | UX: `/credits` → dialog → auto success |
| Q3 | **Mỗi gói một key `system_config` JSON** (`CREDIT_PACKAGE_MONTHLY` / `_YEARLY`) |
| Q4 | Verify tiền webhook vs `priceVnd` trong config |
| Q5 | Click credits → luôn `/credits` |
| Q6 | `credit_checkout` pending + poll |
| Q7 | `CheckoutInstructor` mở rộng `Provider` hiện có |
| Q8 | Fake topup JWT khi flag bật |
| Q9 | `MEUP_{muserId}_{packageId}` |
| Q10 | findOrCreate checkout |
| Q11 | Thêm provider sau: Register + instructor |
| Q12 | Bank / default provider: **env** |
| Q13 | Staging SePay đã có |
| Q14 | Đúng 2 gói monthly / yearly |
| Q15 | Copy giải thích đủ trên card |
| Q16 | **`credit_package`: A — drop FK, lookup config** ✅ |

---

## 5. Payment contract — tận dụng registry hiện có

**Không** tạo hệ payment mới. Webhook giữ:

```text
Provider.HandleWebhook → Fulfillment → Creditor.FulfillPurchase
```

**Bổ sung** trên cùng package `payment`:

```go
type CheckoutInstructor interface {
    Provider
    BuildInstructions(ctx context.Context, req CheckoutRequest) (PaymentInstructions, error)
}
```

`PaymentInstructions.method`: `bank_transfer_qr` | `redirect` | `none`.  
SePay implement QR/bank; core checkout chỉ gọi instructor từ `Register`.

---

## 6. Flow to-be

```text
[Web] GET packages (từ system_config via API)
    → POST /payment/checkout { packageId }
    → core: credit_checkout pending + CheckoutInstructor.BuildInstructions
    → Dialog QR / poll GET /payment/checkout/{id}
[SePay] webhook → validate amount vs config priceVnd
    → FulfillPurchase → complete checkout
[Web] status=completed → success + refreshAccount
```

---

## 7. API

### 7.1 Migration

1. **`credit_checkout`** (bắt buộc cho poll) — uuid/text id, user, package_id, provider, amount_vnd, credit_amount, transfer_content, status, purchase_id, expires…  
2. **Drop FK** `credit_purchase.credit_package_id` → `credit_package`.  
3. **Không** thêm `price_vnd` vào `credit_package`; không bắt buộc drop table trong cùng migration.

### 7.2 Config

- Thêm `CREDIT_PACKAGE_MONTHLY` + `CREDIT_PACKAGE_YEARLY` vào `systemconfig` keys + admin catalog (kind json) + default §1.1.  
- Parse helper: get by id / list cả hai key.

### 7.3 Endpoints

| Method | Path | Việc |
|--------|------|------|
| GET | `/api/credit-packages` (auth) | Đọc config → packages active |
| POST | `/api/payment/checkout` | Session + instructions |
| GET | `/api/payment/checkout/{id}` | Poll status |
| POST | `/api/payment/fake/topup` | JWT + flag |
| POST | `/api/payment/{provider}/webhook` | Đã có; + amount check + complete checkout |
| GET/PUT | `/api/admin/system-config` | Sửa từng key `CREDIT_PACKAGE_MONTHLY` / `_YEARLY` |

**Deprecate (sau cutover):** `PUT /api/admin/credit-packages`.

### 7.4 Env (bank / provider)

`PAYMENT_DEFAULT_PROVIDER`, `PAYMENT_BANK_*`, `PAYMENT_QR_TEMPLATE`, `SEPAY_*` — chỉ env.  
`ALLOW_FAKE_PAYMENT_PROVIDER` — system_config (đã có).

---

## 8. Web

| Item | Việc |
|------|------|
| `/credits` | 2 gói từ API; copy đủ nghĩa |
| Dialog | Theo `instructions.method`; poll; fake button |
| Header | Click credits → `/credits` thẳng |
| Admin packages UI | **Form riêng** sửa 2 gói (§8.1) — không bắt admin sửa JSON thô |
| i18n | `credits.*` + `admin.packages.*` (bổ sung priceVnd, active, …) |

Không hardcode `qr.sepay.vn` trên web.

### 8.1 Admin UI — sửa 2 credit packages

**Mục tiêu:** Ops đổi tên / credits / giá VND / active mà không đụng JSON editor.

**Chỗ đặt (đề xuất):** Giữ tab **Packages** trên `AdminPanelPage` (thay nội dung sync bảng cũ), **hoặc** section trên `/admin/config`. Ưu tiên **tab Packages trên panel** — form quen, tách khỏi list system-config dài.

**UI:**

- Hai khối cố định: **Gói tháng** / **Gói năm** (không “Add package”, không đổi `id`).
- Mỗi khối field:
  - `name` (text)
  - `amount` (credits/kỳ, number > 0)
  - `priceVnd` (number > 0)
  - `term` + `monthCount` — **read-only** (monthly=1 / yearly=12) hoặc ẩn, lấy từ default; tránh ops sửa sai term
  - `active` (checkbox)
- Nút **Save** từng gói hoặc Save cả hai.
- Load ban đầu: `GET /api/admin/system-config` (hoặc helper đọc 2 key) → parse JSON → form.
- Save: `PUT /api/admin/system-config` từng key `CREDIT_PACKAGE_MONTHLY` / `CREDIT_PACKAGE_YEARLY` với object JSON đã validate phía client.

**Bỏ:**

- Tab packages kiểu sync full-replace `PUT /api/admin/credit-packages` (add/remove rows tùy ý).
- Bắt buộc sửa qua JSON textarea trên Config (vẫn có thể thấy 2 key ở Config list, nhưng **không** là UX chính).

**API phía web:** client gọi system-config; không cần endpoint admin mới trừ khi muốn wrapper tiện — **v1 không bắt buộc** endpoint riêng.

---

## 9. Tasks — xem `docs/tasks/buy-credits/`

Q16 đã chốt **A**. Có thể bắt đầu task 01.

---

## 10. Kiểm thử (rút gọn)

- Admin form: đổi `priceVnd` / `amount` → user `/credits` thấy giá mới (sau cache TTL).  
- Config default / admin PUT từng key → GET packages đúng 2 gói.  
- Checkout → fake topup → poll completed → balance tăng.  
- SePay sai `priceVnd` → không fulfill.  
- Header → `/credits` một bước.

---

## 11. Checklist duyệt

- [x] Catalog = 2 key `system_config` (`CREDIT_PACKAGE_MONTHLY` / `_YEARLY`)  
- [x] UX user + 2 gói + env bank  
- [x] Tận dụng `Provider` registry + thêm `CheckoutInstructor`  
- [x] Admin UI form riêng cho 2 gói (§8.1)  
- [x] **Q16 = A** (drop FK, lookup config)  
- [ ] Task 01+ implementation  

---

## 12. Liên kết

| | |
|--|--|
| Tasks | [`docs/tasks/buy-credits/`](./tasks/buy-credits/README.md) |
| `systemconfig` | `meup-api/internal/systemconfig/` |
| Payment | `meup-api/internal/payment/contract.go` |
| UX remyset | `product_order_bank_view.dart` |
