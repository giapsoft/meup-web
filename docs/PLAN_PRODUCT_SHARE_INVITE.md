# Kế hoạch: Chia sẻ bộ từ vựng qua lời mời (accept / decline)

> **Trạng thái:** Đã chốt sản phẩm + đã triển khai v1 (API + web).  
> **Phạm vi:** **meup-web** + **meup-api** (`d:\giapsoft\gits\meup-api`).  
> **Mục tiêu:** Khi A chia sẻ product (bộ từ vựng) cho B, B **không** dùng ngay. B nhận **lời mời** → chấp nhận hoặc từ chối. Web có menu **「Lời mời (N)」** (luôn hiện N, kể cả 0).  
> **Ngoài phạm vi v1:** push/email notify; invite token cho user chưa có; expire invite; share theo email.

### Chốt bổ sung khi code

| # | Chốt |
|---|------|
| Q1 | Unshare / list theo **deviceOrder** đã dùng lúc mời (lưu `invitee_device_order`). |
| Q2 | UI chỉ hiện **số máy** (không email / userId). |
| Note | Max **500** ký tự. |

---

## 0. Hiện trạng (baseline)

| Khía cạnh | Hôm nay |
|-----------|---------|
| Model | `product_share (product_id, user_id)` = **ACL grant tức thì** |
| Owner | `POST /api/product/share` → insert row; đích email / deviceOrder / userIds |
| Recipient | Không có prompt. Xuất hiện ngay Vocabulary → Shared; sync thiết bị được |
| Inbox / pending | **Không có** |
| Nav | Vocabulary, Explore (+ badge jobs trên Vocabulary) |

**Kết luận:** Invitation lifecycle là **greenfield**. `product_share` vẫn là trạng thái **đã chấp nhận** (access thật).

---

## 1. Quyết định đã chốt ✅

| # | Quyết định | Chốt |
|---|------------|------|
| **C1** | Mọi lần share | **Thành lời mời pending.** Không còn grant tức thì. |
| **C2** | Accept | **Insert `product_share`** (ACL như hiện tại) → vào Shared / sync được. Không copy ownership. |
| **C3** | Đích v1 | **Chỉ số máy (`deviceOrder`).** |
| **C4** | Email | **Bỏ share by email** — UI + API share path v1 chỉ nhận `deviceOrders`. |
| **C5** | Hết hạn | **Không hết hạn.** Decline → `declined`. |
| **C6** | Owner hủy pending | **Có** (cancel), tách với unshare đã accept. |
| **C7** | Re-invite sau decline | **Cho phép.** |
| **C8** | Menu | Main nav `/invitations`, label **Lời mời (N)** / **Invitations (N)**. |
| **C9** | Format label | **Luôn** `Lời mời (N)` kể cả khi N = 0. |
| **C10** | Notify ngoài app | **Inbox-only** (không email/push). |
| **C11** | Share cũ trong DB | **Không quan tâm** — không migrate, không backfill. Behavior mới chỉ cho share mới. |
| **C12** | Ghi chú | **Có** — owner viết note kèm lời mời; recipient đọc trên inbox. |

**Shared tab sau accept:** giữ như library đã accept. Trang Lời mời = pending (và thao tác accept/decline).

---

## 2. Tóm tắt hành vi

| Quyết định | Chi tiết |
|------------|----------|
| Share = invite | `POST /api/product/share` body `{ productId, deviceOrders, note? }` → tạo `product_share_invite` `pending`. **Không** insert `product_share`. |
| Accept | Invitee → insert `product_share` + mark invite `accepted`. |
| Decline | Mark `declined`. Không access. Cho phép invite lại sau đó. |
| Cancel (owner) | Pending → `cancelled`. |
| Unshare (owner) | Giữ API hiện tại trên `product_share` đã accept. |
| Menu | Luôn **Lời mời (N)**; N = pending count. |
| Download / device-programs | Chỉ khi có `product_share`. Pending **không** vào `sharedWithMe`. |
| Note | Lưu trên invite; max length (đề xuất **500** ký tự); optional. |

### 2.1 Ngoài phạm vi v1

- Email / push khi có lời mời.
- Deep link `/invite/:token` cho user chưa có tài khoản.
- Accept = fork / copy product thành owned.
- Expire job / TTL.
- Share theo `emails` / `userIds` (deprecate trên endpoint share; client không gửi).
- Marketplace `shareMode` public/private.

---

## 3. UX mục tiêu

### 3.1 Owner gửi lời mời

```text
Vocabulary → Owned → Share / Gửi lời mời
        ↓
ProductShareModal
  • Chỉ ô số máy (device order) — bỏ email
  • Ô ghi chú (optional)
  • Submit → “Đã gửi lời mời”
  • Danh sách:
      - Pending: hiện note + [Hủy lời mời]
      - Accepted: [Thu hồi quyền] (unshare)
```

### 3.2 Recipient nhận lời mời

```text
Header / drawer → “Lời mời (N)”  (N luôn hiện, kể cả 0)
        ↓
InvitationsPage
  • Card: tên bộ TV, người gửi (device/user), thời gian, ghi chú, meta
  • [Chấp nhận] [Từ chối]
        ↓ Accept → Shared + sync được; N giảm
        ↓ Decline → khỏi pending; N giảm
```

### 3.3 Nav label

- VI: luôn `Lời mời ({{count}})` — ví dụ `Lời mời (0)`, `Lời mời (3)`.
- EN: luôn `Invitations ({{count}})`.

---

## 4. Thiết kế dữ liệu (meup-api)

### 4.1 Bảng mới `product_share_invite`

```sql
CREATE TABLE product_share_invite (
    id           BIGSERIAL PRIMARY KEY,
    product_id   BIGINT NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    invitee_id   BIGINT NOT NULL REFERENCES muser (id) ON DELETE CASCADE,
    inviter_id   BIGINT NOT NULL REFERENCES muser (id),
    status       TEXT NOT NULL CHECK (status IN (
                   'pending', 'accepted', 'declined', 'cancelled'
                 )),
    note         TEXT NULL,  -- ghi chú từ người mời; CHECK length nếu cần
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX uq_product_share_invite_pending
  ON product_share_invite (product_id, invitee_id)
  WHERE status = 'pending';

CREATE INDEX idx_product_share_invite_invitee_pending
  ON product_share_invite (invitee_id)
  WHERE status = 'pending';
```

**Giữ** `product_share` nguyên — access đã accept.

### 4.2 Migration data

- **Không** đụng row `product_share` cũ (C11).
- Behavior mới chỉ cho lời mời tạo sau deploy.

### 4.3 Quy tắc nghiệp vụ

| Sự kiện | Điều kiện | Kết quả |
|---------|-----------|---------|
| Create invite | Owner; resolve `deviceOrder` → user; chưa share; chưa pending | Insert pending (+ note) |
| Create invite | `deviceOrder` không map được user | `404 share_target_not_found` |
| Create invite | Đã có `product_share` | `409 already_has_access` |
| Create invite | Đã pending | No-op / return existing |
| Create invite | Sau decline/cancel | Insert pending mới (C7) |
| Accept | Invitee; pending | Insert `product_share` + `accepted` |
| Decline | Invitee; pending | `declined` |
| Cancel | Owner/inviter; pending | `cancelled` |
| Unshare | Owner; đã accept | Xóa `product_share` |

---

## 5. API contract (meup-api)

### 5.1 Đổi endpoint hiện có

| Method | Path | Đổi |
|--------|------|-----|
| `POST` | `/api/product/share` | Tạo **pending invite**. Body v1: `{ productId, deviceOrders: string[], note?: string }`. **Không nhận / bỏ qua** `emails`, `userIds` (hoặc trả `400` nếu gửi — chọn một: **đề xuất reject rõ** để tránh nhầm). Không insert `product_share`. |
| `GET` | `/api/product/shares?productId=` | Owner: `shares` (accepted) + `invites` (pending, kèm `note`). |
| `POST` | `/api/product/unshare` | Chỉ revoke accepted `product_share`. Body đích: `deviceOrders` only (đồng bộ C3/C4). |

### 5.2 Endpoint mới

| Method | Path | Ai | Mô tả |
|--------|------|----|-------|
| `GET` | `/api/product/invitations?status=pending` | Invitee | List lời mời (default pending) |
| `GET` | `/api/product/invitations/count` | Invitee | `{ pendingCount: number }` |
| `POST` | `/api/product/invitations/:id/accept` | Invitee | Accept |
| `POST` | `/api/product/invitations/:id/decline` | Invitee | Decline |
| `POST` | `/api/product/invitations/:id/cancel` | Owner/inviter | Hủy pending |

### 5.3 Payload list (invitee) — sketch

```json
{
  "invitations": [
    {
      "id": "…",
      "status": "pending",
      "note": "Học tuần này nhé",
      "createdAt": "…",
      "product": {
        "id": "…",
        "name": "…",
        "wordCount": 120,
        "nativeLang": "vi",
        "studyLang": "en"
      },
      "inviter": {
        "userId": "…",
        "deviceOrder": "12345"
      }
    }
  ]
}
```

Inviter hiển thị ưu tiên `deviceOrder` (không phụ thuộc email).

### 5.4 Access sau accept

- `ListDevicePrograms` / download ACL: chỉ `product_share`.
- Pending không cấp quyền.
- Purchase `already_has_access`: khi đã có `product_share` (pending không block mua — edge case hiếm).

### 5.5 Docs

- Cập nhật `meup-api/docs/API.md`, `DATABASE.md`, Postman nếu dùng.

---

## 6. Web (meup-web)

### 6.1 Route & nav

| File | Việc |
|------|------|
| `src/config/nav.ts` | `{ path: '/invitations', labelKey: 'nav.invitations' }` |
| `src/App.tsx` | Route → `InvitationsPage` |
| `src/components/MainNav.tsx` / `NavDrawer.tsx` | Label luôn `t('nav.invitationsWithCount', { count })` |
| `src/components/Header.tsx` | Wire `usePendingInvitationCount` |

### 6.2 Pages / components

| File | Việc |
|------|------|
| `src/pages/InvitationsPage.tsx` | **Mới** — list pending, note, Accept / Decline |
| `src/components/ProductShareModal.tsx` | Chỉ device order + note; pending cancel; accepted unshare; bỏ UI email |
| `src/pages/ProductsPage.tsx` | Shared = đã accept (không đổi nguồn data) |
| `src/api/product.ts` | Client share/invite DTOs |
| `src/hooks/usePendingInvitationCount.ts` | **Mới** |

### 6.3 i18n

- `nav.invitationsWithCount`: `"Lời mời ({{count}})"` / `"Invitations ({{count}})"`
- `invitations.*` — title, empty, accept, decline, note label, errors
- `products.share.*` — đổi copy sang “Gửi lời mời”; bỏ key/UI email; thêm `note` / `notePlaceholder`

### 6.4 InvitationsPage

- Empty: “Không có lời mời đang chờ” (vẫn thấy menu `Lời mời (0)`).
- Hiện note nếu có.
- Sau accept: toast + optional `/products?tab=collected&collected=shared`.

---

## 7. Thứ tự triển khai

```text
Phase A — API
  1. Migration product_share_invite (+ note)
  2. Store: CreateInvite(deviceOrders, note), List, Count, Accept, Decline, Cancel
  3. Share() → invite only; reject emails/userIds
  4. ListShares owner: shares + pending invites
  5. Routes + tests
  6. Docs API/DB

Phase B — Web inbox
  7. API client + usePendingInvitationCount
  8. InvitationsPage + route + nav “Lời mời (N)” luôn
  9. i18n en/vi + types

Phase C — Owner UX
  10. ProductShareModal: deviceOrder + note; pending/accepted
  11. Bỏ email share UI
  12. QA §8
```

---

## 8. Test plan

### 8.1 API

- [ ] Share chỉ `deviceOrders` + optional `note` → pending invite, không có `product_share`
- [ ] Share kèm `emails` / `userIds` → 400 (nếu chọn reject)
- [ ] Device order không tồn tại → 404
- [ ] Invitee device-programs **không** có product khi pending
- [ ] Accept → `product_share` + sharedWithMe
- [ ] Decline → không share; count giảm; share lại được
- [ ] Cancel bởi owner → invitee không thấy
- [ ] Trùng pending → không duplicate
- [ ] Đã accept → 409 already_has_access
- [ ] Note lưu và trả về đúng (null / text; max length)
- [ ] Unshare sau accept → mất access

### 8.2 Web

- [ ] Nav luôn `Lời mời (0)` / `(N)`; cập nhật sau accept/decline
- [ ] Inbox: note hiển thị; empty state
- [ ] Accept → Shared có item
- [ ] Modal: chỉ số máy + note; cancel vs revoke
- [ ] Không còn ô email share
- [ ] Mobile drawer + desktop; i18n VI/EN

### 8.3 Regression

- [ ] Purchase already_has_access khi đã shared
- [ ] Owner unshare accepted
- [ ] Explore / create / credits không ảnh hưởng

---

## 9. Inventory file

### meup-api

| Path | Thay đổi |
|------|----------|
| `internal/database/migrations/0000xx_product_share_invite.*.sql` | Mới |
| `internal/product/share.go` | Share → invite; deviceOrder-only; note |
| `internal/product/invite.go` | Accept/decline/cancel/list/count |
| `internal/httpapi/routes/product.go` | Routes |
| `internal/product/*_test.go` | Tests |
| `docs/API.md`, `docs/DATABASE.md` | Spec |

### meup-web

| Path | Thay đổi |
|------|----------|
| `docs/PLAN_PRODUCT_SHARE_INVITE.md` | Plan này |
| `src/config/nav.ts`, `App.tsx`, `Header.tsx`, `MainNav.tsx`, `NavDrawer.tsx` | Nav |
| `src/pages/InvitationsPage.tsx` | Mới |
| `src/hooks/usePendingInvitationCount.ts` | Mới |
| `src/api/product.ts` | Client |
| `src/components/ProductShareModal.tsx` | Device + note |
| `src/locales/en.json`, `vi.json`, `src/i18n/types.ts` | Copy |

---

## 10. Rủi ro & lưu ý

| Rủi ro | Mitigation |
|--------|------------|
| Breaking: share tức thì → invite | Cố ý; ship web + API cùng lúc. |
| Client cũ còn gửi email | API reject `emails`/`userIds` với lỗi rõ. |
| Align `PLAN_DEVICE_ONLY_WEB` | Cùng hướng: chỉ device order — có thể làm chung phần UI share. |
| Note quá dài / XSS | Max length server; render text escape trên web. |
| Double-accept race | Unique PK `product_share` + transaction. |

---

## 11. Definition of done (v1)

1. Share mới → pending invite; recipient không sync/học đến khi Accept.  
2. Menu luôn **Lời mời (N)** đúng count.  
3. Accept / Decline / Cancel + note end-to-end.  
4. Chỉ đích `deviceOrder`; không email.  
5. Shared / device-programs chỉ sau accept.  
6. Tests + docs cập nhật.

---

## 12. Next step

Implement **Phase A → B → C** theo §7 khi được yêu cầu code.
