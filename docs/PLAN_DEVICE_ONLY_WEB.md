# Kế hoạch: meup-web chỉ phục vụ user có thiết bị (bỏ đăng ký / đăng nhập)

> **Trạng thái:** Draft — chưa code.  
> **Phạm vi:** chỉ **meup-web** (UX/UI + client auth gate + copy i18n).  
> **Mục tiêu:** Web không còn đăng ký / đăng nhập bằng email hay Google. User **luôn** mở thiết bị MeUp, quét mã QR để vào phiên quản lý từ vựng / sản phẩm gắn với thiết bị đó.  
> **Ngoài plan này:** thay đổi contract API phía meup-api / firmware (trừ khi web buộc phải bỏ field client-side đã chết).

---

## 1. Quyết định sản phẩm

| Quyết định | Chi tiết |
|------------|----------|
| Entry duy nhất | **QR redeem** (`POST /api/device/link/redeem`) → JWT trong `sessionStorage` (giữ model hiện tại). |
| Bỏ khỏi web | Màn `/login`, `/register`, Google Sign-In, form email/password, link “tạo tài khoản”. |
| Trang thay login | Khi chưa có session hợp lệ → **trang hướng dẫn**: mở thiết bị → quét QR → quản lý từ vựng trên web. Không có form đăng nhập. |
| Verify email | Bỏ UX web: `/verify-email`, banner `VerifyEmailNotice`, resend. (API có thể còn; web không gọi.) |
| Logout | Giữ hành động “kết thúc phiên” (xoá token + session) → về trang hướng dẫn QR (không về login). Copy đổi từ “Đăng xuất” → kiểu “Ngắt kết nối” / “Kết thúc phiên”. |
| Chia sẻ sản phẩm | Chỉ còn đích **số máy (device order)**. Bỏ ô email / chia sẻ theo tài khoản email trên UI. |
| Credits / Explore / Create | **Giữ** — vẫn chạy trên JWT từ QR (device-linked identity). Không yêu cầu email account. |
| Admin | **Không đổi** — `/admin/*` dùng secret riêng, không phụ thuộc user login. |
| Guest browse | **Không** — không mở Home/Products/Explore khi chưa redeem. |

### 1.1 Ngoài phạm vi (không đụng trong plan này)

- Firmware / màn hình QR trên thiết bị.
- Đổi format path QR (`/[study?][native?][order][hash6]`) hay API redeem.
- Xoá endpoint `/api/auth/login|register|google` phía server (web chỉ thôi gọi).
- Marketplace seller / payout gắn email (route `/seller` đã redirect `/`) — để follow-up nếu cần.
- Payment QR SePay trên Credits — không liên quan device auth.

### 1.2 Giả định cần chốt trước khi code

1. **Session sau QR** vẫn là JWT hiện tại (`meup.authTokens` + refresh). Web không đổi sang “guest cookie” riêng.
2. User mở `meup.web` trực tiếp (bookmark, không quét) → **chỉ** thấy trang hướng dẫn; không còn cách tạo account trên web.
3. Chia sẻ theo email: **ẩn/xoá trên web**. Nếu API vẫn nhận `email`, client không gửi. Danh sách share cũ có thể còn entry email từ trước — UI hiển thị `deviceOrder` / `userId` / email read-only nếu API trả về, nhưng form thêm mới chỉ nhận device order.
4. Tab “Shared with me” / `device-programs` **giữ** — phù hợp model thiết bị nhận share.

---

## 2. UX mục tiêu

### 2.1 Chưa có phiên

```text
Mở meup-web (không token, không QR path)
        ↓
Trang hướng dẫn (thay AuthPages)
  • Brand MeUp
  • Tiêu đề: Quản lý từ vựng từ thiết bị
  • Hướng dẫn ngắn: mở thiết bị → quét mã QR → trình duyệt mở link → vào app
  • (Tuỳ chọn) illustration / bước 1-2-3; không form, không Google
        ↓
User quét QR → URL path redeem → Loading → App shell
```

### 2.2 Có phiên (sau QR)

Giống hiện tại: Home, Products, Create, Explore, Credits, chỉnh study lang, share theo device order.

### 2.3 Kết thúc phiên

```text
Header / drawer → “Ngắt kết nối”
        ↓
clearAuthTokens + clearDeviceSession + reauthorize
        ↓
Trang hướng dẫn QR (không /login)
```

### 2.4 QR lỗi / hết hạn

Hiện failed redeem dễ rơi về login. Mục tiêu: trang lỗi rõ (“Mã đã hết hạn / không hợp lệ — mở lại QR trên thiết bị”) + CTA về trang hướng dẫn. Mount lại `NotFoundPage` hoặc trang `DeviceLinkErrorPage` riêng (ưu tiên copy thân thiện hơn 404 thuần).

---

## 3. Inventory — nơi cần cập nhật

### 3.1 Auth gate & entry (ưu tiên cao)

| File | Việc cần làm |
|------|----------------|
| `src/context/DeviceSessionProvider.tsx` | Unauthorized → render trang hướng dẫn thay `AuthPages`. Bỏ nhánh `/login` `/register` trong navigate. Failed redeem → error page, không login. Giữ redeem + token refresh. Có thể bỏ mount `VerifyEmailPage`. |
| `src/pages/auth/AuthPages.tsx` | **Thay hoặc xoá**: không còn Login/Register. Có thể rename thành `DeviceAccessGuidePage` (1 route công khai, `*` → guide). |
| `src/pages/AuthGatePages.tsx` | Dùng / mở rộng `NotFoundPage` hoặc thêm `DeviceLinkErrorPage` cho redeem fail. |
| `src/pages/auth/VerifyEmailPage.tsx` | Gỡ khỏi router; file có thể xoá hoặc để dead code cleanup cùng PR. |
| `src/App.tsx` / `src/app/App.ts` | Logout navigate → path guide (vd. `/` unauthorized hoặc `/connect`), không `/login`. |
| `src/components/GoogleSignInButton.tsx` | Không còn dùng → xoá hoặc để follow-up cleanup. |
| `src/api/emailAuth.ts` | **Giữ** `getAccount`, `updateLangPrefs` (và phần AccountProvider cần). **Ngừng export/dùng** `loginEmail`, `registerEmail`, `loginGoogle`, `verifyEmailToken`, `resendVerification` trên UI. Có thể tách file sau (không bắt buộc cùng PR). |
| `src/config.ts` | Có thể giữ hằng API login/register (dead) hoặc xoá nếu không còn reference — cleanup nhẹ. |

### 3.2 Shell / account UX gắn email

| File | Việc cần làm |
|------|----------------|
| `src/components/VerifyEmailNotice.tsx` | Gỡ khỏi Header/NavDrawer; xoá component nếu không dùng. |
| `src/components/Header.tsx` | Bỏ banner verify; đổi label logout. |
| `src/components/NavDrawer.tsx` | Bỏ verify + đổi copy logout. |
| `src/context/AccountProvider.tsx` | Giữ load credits/account từ JWT device; không phụ thuộc email verified. |

### 3.3 Chia sẻ từ vựng / sản phẩm

| File | Việc cần làm |
|------|----------------|
| `src/components/ProductShareModal.tsx` | Form chỉ còn **device order** (bắt buộc). Bỏ state/input email. Validation: chỉ order hợp lệ. `shareLabel`: ưu tiên device order / userId; email chỉ nếu entry cũ còn. Cập nhật subtitle/hint. |
| `src/api/product.ts` | Client `shareProduct`: chỉ gửi `deviceOrders` (không gửi `email` rỗng nếu API cho phép omit). Không đổi URL endpoint. |
| `src/pages/ProductsPage.tsx` | Tab Shared / copy “shared with you” — rà lại wording: nhận share qua số máy, không “tài khoản email”. |
| Explore `shareMode` public/private | **Giữ** (visibility marketplace), khác với “share cho user/device”. |

### 3.4 i18n

| File | Việc cần làm |
|------|----------------|
| `src/locales/vi.json` / `en.json` | Thêm keys trang hướng dẫn + lỗi QR. Đổi `nav.logout`. Rút/gỡ keys `auth.login.*`, `auth.register.*`, Google, verify (hoặc để orphan rồi dọn). Cập nhật `products.share.*` (bỏ email hint). |
| `src/i18n/types.ts` | Đồng bộ TranslationKey. |

### 3.5 Docs

| File | Việc cần làm |
|------|----------------|
| `README.md` | Device link là **cách duy nhất** vào web; bỏ hướng dẫn login/register nếu có. |
| `docs/UX_SCREEN_LAYOUT_PLAN.md` | Phụ lục auth: Login/Register → Device access guide; verify bỏ. |
| `docs/API_UI_GAP.md` | Ghi chú web không còn gọi auth email/Google. |
| `docs/PLAN_WEB_API_FLOW_V2.md` | Cập nhật đoạn logout / entry nếu còn mô tả login. |

### 3.6 Không cần đổi logic nghiệp vụ (chỉ xác nhận)

- `src/api/deviceLink.ts`, `src/utils/linkParams.ts` — giữ redeem/parse.
- Create/edit program, Credits checkout, Explore purchase — vẫn JWT.
- Admin routes.

---

## 4. Luồng kỹ thuật sau thay đổi

```text
DeviceSessionProvider
  1. Token còn hạn / refresh OK → authorized → App
  2. Path/query QR → redeem 1 lần
       OK  → authorized → (SelectStudyLang nếu thiếu study) → App
       FAIL → DeviceLinkErrorPage
  3. Else → DeviceAccessGuidePage  (thay AuthPages)
```

Public routes còn lại:

| Path | Vai trò |
|------|---------|
| Guide (vd. `/` unauthorized hoặc `/connect`) | Nhắc quét QR |
| `/[QR segment]` | Parse + redeem (như hiện tại) |
| `/admin/*` | Admin secret |
| ~~`/login` `/register` `/verify-email`~~ | Redirect → guide hoặc 404 mềm |

---

## 5. Thứ tự triển khai đề xuất

### Phase A — Entry & copy (P0)

1. Tạo `DeviceAccessGuidePage` (UI + i18n vi/en).
2. `DeviceSessionProvider`: unauthorized → guide; redirect `*` /login /register → guide.
3. Logout → guide; đổi label nav.
4. Failed redeem → error page thân thiện.
5. Gỡ Google / form login-register khỏi bundle entry (xoá route hoặc xoá file).

### Phase B — Share device-only (P0)

1. `ProductShareModal`: chỉ device order.
2. i18n share + empty/list copy.
3. Smoke: share theo order → máy kia quét QR → thấy tab Shared.

### Phase C — Dọn email-auth UX (P1)

1. Gỡ `VerifyEmailNotice`, `VerifyEmailPage`, resend.
2. Dọn keys i18n chết; README + UX plan.
3. (Tuỳ chọn) tách `emailAuth.ts` → `account.ts` (getAccount / lang prefs only) để tên file khớp model.

### Phase D — Follow-up ngoài plan hoặc P2

- Quyết định có hiện email trên share list cũ hay ẩn hoàn toàn.
- Seller/payout nếu sau này gắn device.
- Deep-link marketing trang web → luôn guide (SEO/landing riêng nếu cần).

---

## 6. Checklist kiểm thử (meup-web)

- [ ] Mở site không token → trang hướng dẫn; **không** form login/register/Google.
- [ ] `/login`, `/register` → redirect guide (hoặc không còn route).
- [ ] Quét / mở path QR hợp lệ → redeem → vào Home.
- [ ] QR hết hạn / sai → trang lỗi + nhắc quét lại; không rơi login (và không để AuthPages redirect nuốt path QR sau logout).
- [ ] Đăng xuất → quét QR **mới** (cùng tab) → vào app được (regression: trước đây `*` → `/login` ăn mất mã).
- [ ] QR thiếu study → `SelectStudyLangPage` như hiện tại.
- [ ] Ngắt kết nối → xoá session → guide; mở lại app không còn token.
- [ ] Share chỉ nhập device order thành công; không còn field email.
- [ ] Tab Shared / device-programs vẫn nhận sản phẩm được share.
- [ ] Credits / Create / Explore vẫn hoạt động với session QR.
- [ ] Admin `/admin` không regress.
- [ ] Không còn banner verify email trên Header/Drawer.
- [ ] i18n vi + en trang guide + share + logout.

---

## 7. Rủi ro / câu hỏi mở

| Rủi ro / câu hỏi | Gợi ý xử lý |
|------------------|-------------|
| User cũ đã login email (token trong tab) | Vẫn dùng được đến khi hết hạn / logout. Không migrate bắt buộc. Sau logout chỉ vào lại bằng QR. |
| Share theo email là workflow hiện tại của một số user | Web bỏ; hướng dẫn dùng số máy. Nếu API bắt buộc có account email phía nhận — cần xác nhận với backend (ngoài plan): device order đã resolve identity chưa. |
| Credits gắn “account” | Device redeem đã cấp JWT + `getAccount` — giữ nguyên. Nếu sau này API tách billing theo device, plan khác. |
| Bookmark `/login` từ docs cũ | Redirect guide. |
| `getAccount` trả user không email | Đã có (device-only); verify banner vốn ẩn — sau plan thì không còn banner. |
| Có cần illustration / video trên guide? | P0: copy + 2–3 bước text đủ. Visual polish = follow-up. |

### 7.1 Khuyến nghị chốt trước khi code

> **Entry:** chỉ QR redeem.  
> **Unauthorized UI:** một trang hướng dẫn, không auth form.  
> **Share:** chỉ `deviceOrder`.  
> **Verify email / Google / register:** gỡ khỏi web.  
> **Phạm vi API:** không đổi server trong plan này.

---

## 8. Tóm tắt file đụng tay (checklist PR)

**Phải sửa**

- [ ] `src/context/DeviceSessionProvider.tsx`
- [ ] `src/pages/auth/AuthPages.tsx` → thay bằng guide (hoặc file mới + xoá cũ)
- [ ] `src/pages/AuthGatePages.tsx` (error QR)
- [ ] `src/App.tsx` (logout navigate)
- [ ] `src/components/ProductShareModal.tsx`
- [ ] `src/components/Header.tsx` / `NavDrawer.tsx`
- [ ] `src/locales/vi.json` / `en.json`
- [ ] `src/i18n/types.ts`
- [ ] `README.md`

**Nên dọn**

- [ ] `src/pages/auth/VerifyEmailPage.tsx`
- [ ] `src/components/VerifyEmailNotice.tsx`
- [ ] `src/components/GoogleSignInButton.tsx`
- [ ] `src/api/emailAuth.ts` (chỉ còn account helpers dùng được)
- [ ] `docs/UX_SCREEN_LAYOUT_PLAN.md`, `docs/API_UI_GAP.md`, `docs/PLAN_WEB_API_FLOW_V2.md`

**Không đổi (xác nhận vẫn chạy)**

- `deviceLink.ts`, `linkParams.ts`, Products/Explore/Credits/Create, Admin
