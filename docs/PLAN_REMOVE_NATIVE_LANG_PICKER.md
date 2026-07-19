# Kế hoạch: Bỏ chọn Native language — chỉ còn chọn ngôn ngữ học

> **Trạng thái:** **Shipped (code)** — 2026-07-19.  
> **Phạm vi:** chỉ **meup-web** (UX/UI + client prefs / session).  
> **Mục tiêu:** User không còn chọn *ngôn ngữ nguồn / native*; mọi chỗ chọn ngôn ngữ trên app chỉ còn **ngôn ngữ học (study)**.  
> **Ngoài plan này:** tách UI locale thành picker riêng.

---

## 1. Quyết định sản phẩm

| Quyết định | Chi tiết |
|------------|----------|
| UX | Chỉ còn 1 picker: **Study language**. Bỏ picker Native / Source. |
| Giá trị `nativeLang` | Không cho user chọn. Nguồn: QR/path → account prefs → session → `DEFAULT_NATIVE_LANG` (`vi`). Client vẫn truyền field hiện có khi gọi API (không đổi contract phía web). |
| QR / URL | Vẫn **parse** native từ path/query nếu có; **không** expose UI để đổi. Nếu path không mang native → fallback `vi`. |
| Chip header | Hiện **tên ngôn ngữ study** (vd. `English`, `日本語` — dùng `nativeName` / label catalog), **không** hiện mã (`en`) và **không** còn dạng `vi → en`. |
| Cảnh báo cùng ngôn ngữ | Bỏ (không còn case user chọn native = study). |
| UI locale (`t(...)`) | Hiện `resolveUiLocale(nativeLang)` → với native mặc định `vi`, UI mặc định **tiếng Việt**. Đổi ngôn ngữ giao diện = task riêng. |
| Schema flashcard `langType: 'native'` | **Giữ** — đây là “bản nghĩa / meaning side”, không phải picker ngôn ngữ nguồn của user. |

### 1.1 Ngoài phạm vi (không đụng)

- `Language.nativeName` trong catalog (`src/data/mock.ts`) — tên gọi bản địa của ngôn ngữ.
- Preset `nativeText` / `langType: 'native'` trong create/edit program.
- Đổi chữ ký / field API phía server — không thuộc plan meup-web này.

---

## 2. UX mục tiêu

```text
Header chip → tên ngôn ngữ study (vd. "English", "Tiếng Việt") — không mã ISO
        ↓
Mở sheet/popover → chỉ 1 LanguagePicker: ngôn ngữ học
        ↓
Đổi study → patch session + cập nhật lang prefs (native vẫn gửi = giá trị hiện có / default)
```

Gate QR thiếu study (đã có): `SelectStudyLangPage` — **giữ**, không thêm bước chọn native.

Home: bỏ / rút gọn dòng “cặp ngôn ngữ” kiểu `vi → en` + `sameWarning`; có thể hiện “Đang học {study}” nếu vẫn muốn hint.

---

## 3. Inventory — nơi cần cập nhật

### 3.1 UI chọn ngôn ngữ (ưu tiên cao)

| File | Việc cần làm |
|------|----------------|
| `src/components/LanguagePairChip.tsx` | `LanguagePairPanel`: xoá `LanguagePicker` native + `sameWarning`. Chỉ còn study picker. Chip label: **tên** ngôn ngữ study từ catalog (`findLanguage(studyLang)?.nativeName` / tương đương — **không** hiện code `en`). Fallback code nếu không tìm thấy trong catalog. Đổi title/aria từ “cặp ngôn ngữ” → “ngôn ngữ học”. Có thể rename component → `StudyLangChip` (tuỳ chọn, cùng PR hoặc follow-up). |
| `src/components/Header.tsx` | Dùng chip đã rút gọn; không đổi vị trí. |
| `src/pages/HomePage.tsx` | Bỏ `sameLanguage` / `languagePair.sameWarning`. Cập nhật `pairLabel` / `home.pairSummary` → copy theo study only (hoặc bỏ dòng summary nếu thừa). |
| `src/pages/SelectStudyLangPage.tsx` | Giữ nguyên (đã đúng model). Kiểm tra copy i18n còn khớp. |

### 3.2 Context / session / prefs

| File | Việc cần làm |
|------|----------------|
| `src/context/LanguagePairProvider.tsx` | **Bỏ** `setNativeLang` khỏi public API context (hoặc để private/no-op). `nativeLang` vẫn expose **read-only** cho các chỗ gọi API. `setStudyLang` khi cập nhật prefs luôn truyền native hiện tại (session/`initialNativeLang`). `uiLocale` vẫn từ `nativeLang` cho đến khi có task UI locale riêng. |
| `src/context/DeviceSessionProvider.tsx` | Đơn giản hoá nhánh merge account/URL: không còn ưu tiên “user vừa chọn native”. Khi thiếu native → luôn `DEFAULT_NATIVE_LANG`. Gate `RequireStudyLang` giữ. Comment path QR cập nhật: native optional, không phải lựa chọn web. |
| `src/utils/deviceSessionStorage.ts` | Giữ shape `{ nativeLangCode, studyLangCode }` (tương thích session cũ). Không cần UI write native; `patchDeviceSession` chỉ còn study từ UI. |
| `src/utils/accountLangPrefs.ts` | Vẫn đọc `nativeLangCode` từ account nếu có; nếu thiếu → `vi`. Không validate “user phải chọn native”. |
| `src/utils/langCode.ts` | Giữ `DEFAULT_NATIVE_LANG = 'vi'`. Document: đây là native **implicit**, không phải lựa chọn UI. |
| `src/utils/linkParams.ts` | Giữ parse `nativeLangCode` từ path/query (device QR). `resolveLangPair` / `langPairFromDeviceLink`: fallback native = `vi`. Comment: web không cho đổi native. |
| `src/api/emailAuth.ts` | `updateLangPrefs(native, study)` giữ như hiện tại. Caller chỉ đổi `study`; native luôn giá trị session/default. |

### 3.3 Màn hình / client vẫn truyền pair (không xoá field — chỉ thôi phụ thuộc UI native)

Các chỗ này **vẫn** gửi `nativeLang` + `studyLang` khi filter/list/create. Sau thay đổi, `nativeLang` = giá trị session/account/default, không lấy từ picker.

| File | Ghi chú |
|------|---------|
| `src/pages/ProductsPage.tsx` | Filter list theo pair; copy `products.langPair` / `filterPair*` có thể đổi sang “ngôn ngữ học: {study}” (xem §3.4 i18n). |
| `src/pages/ExplorePage.tsx` | Tương tự filter + `explore.filterPair`. |
| `src/pages/HomePage.tsx` | `listOwnedProducts` / create requests vẫn truyền pair. |
| `src/pages/edit-program/EditProgramPage.tsx` | Truyền `nativeLang` xuống vocab / list owned. |
| `src/pages/create-program/CreateProgramManualPage.tsx` | `nativeLangId` / props table. |
| `src/pages/create-program/CreateProgramFromTitlePage.tsx` | `nativeLangId` trong create body. |
| `src/pages/create-program/CreateProgramFromParagraphPage.tsx` | Như trên. |
| `src/pages/create-program/CreateProgramFromImagePage.tsx` | Như trên. |
| `src/hooks/useActiveCreateRequestCount.ts` | Query theo pair. |
| `src/api/product.ts` | Types/query `nativeLang` — **giữ**. |
| `src/api/productCreate.ts` | `nativeLangId` — **giữ**. |
| `src/components/create/VocabEntryDialog.tsx` | Props `nativeLang` — giữ. |
| `src/components/create/VocabEntryTable.tsx` | `langForAttr(..., nativeLang, studyLang)` — giữ. |
| `src/components/create/AiCreatePageShell.tsx` | Hint `createProgram.pairHint` — cập nhật copy. |
| `src/utils/exportVersionTree.ts` | `pair: { nativeLang, studyLang }` — giữ. |
| `src/utils/deviceProgramsCompact.ts` | Match `langPair` — giữ. |
| `src/i18n/messages.ts` | `langPairId(native, study)` — giữ helper. |
| `src/app/App.ts` | Field `nativeLangCode` / `nativeLangName` nếu còn dùng config — rà soát, không expose picker. |

### 3.4 i18n

| Key / nhóm | Việc cần làm |
|------------|----------------|
| `languagePair.nativeLabel`, `languagePair.nativeHint` | Xoá hoặc unused (sau khi bỏ picker). |
| `languagePair.title`, `languagePair.subtitle` | Đổi → “Ngôn ngữ học” / hint chỉ nói study; hoặc thay bằng key `studyLang.*`. |
| `languagePair.sameWarning` | Xoá (UI + `HomePage` + `i18n/types.ts`). |
| `languagePair.currentPair` | Đổi hoặc thay bằng study-only. |
| `nav.changeLanguagePair` | → “Đổi ngôn ngữ học” (en/vi + locale partials). |
| `home.pairSummary` | → “Đang học {study}” (bỏ format cặp `A → B`). |
| `products.langPair`, `products.filterPair*`, `explore.filterPair`, `createProgram.pairHint` | Copy từ “cặp ngôn ngữ / pair” → “ngôn ngữ học”. |
| `selectStudy.*` | Giữ; chỉnh hint nếu cần. |

**File locale cần sửa:**

- `src/locales/vi.json`, `src/locales/en.json` (canonical)
- Partial: `ja.json`, `ko.json`, `zh.json`, `fr.json`, `de.json`
- `src/i18n/types.ts` — thêm/xoá `TranslationKey` cho khớp

### 3.5 Docs / README (trong meup-web)

| File | Việc cần làm |
|------|----------------|
| `README.md` | Mục QR path / LanguagePairProvider: web chỉ chọn study; native mặc định `vi` (path vẫn có thể mang native). |
| `docs/UX_SCREEN_LAYOUT_PLAN.md` | D3.1 Home “Language pair”, D2 Pair chip, bảng QR — cập nhật mô tả study-only. |
| `docs/PLAN_WEB_API_FLOW_V2.md` | Đoạn khởi tạo pair — ghi chú web không picker native. |
| `docs/API_UI_GAP.md` | Nếu có dòng “lang prefs = pair” — cập nhật. |
| File này | Đánh dấu Shipped khi xong. |

### 3.6 Không đổi (xác nhận)

| Hạng mục | Lý do |
|----------|--------|
| `createProgram.stepSchema.langType.native` / preset `nativeText` | Schema thẻ học, không phải picker user native. |
| `src/data/mock.ts` → `nativeName` | Label hiển thị ngôn ngữ. |
| Client `updateLangPrefs` / query `nativeLang` | Giữ payload hiện tại; chỉ thôi UI chọn native. |
| Path QR `[study?][native?][order][mac6]` | Parse như cũ; web chỉ không UI-edit native. |

---

## 4. Thứ tự implement đề xuất

1. **UI chip + panel** — bỏ native picker; label = tên study (`LanguagePairChip`).
2. **Provider** — `setNativeLang` không public; `setStudyLang` cập nhật prefs với native session/default.
3. **Home + copy i18n** — bỏ same-language warning; cập nhật nav/home/products/explore hints.
4. **Session / linkParams comments + fallback** — thiếu native → `vi`.
5. **Docs** — README + UX plan + đánh dấu plan này.
6. **Smoke manual** — xem checklist §5.

Rename lớn (`LanguagePair*` → `StudyLang*`) **không bắt buộc** trong PR đầu; có thể follow-up để tránh diff lan.

---

## 5. Checklist test thủ công

- [ ] Header chip hiện **tên** ngôn ngữ study (vd. English), không mã `en`, không `vi → en`; mở panel chỉ 1 dropdown study.
- [ ] Đổi study → Products / Explore / Create filter theo pair hiện tại (native từ session/account/default + study mới).
- [ ] QR không mang study → vẫn vào `SelectStudyLangPage`; sau chọn vào app.
- [ ] QR mang `study` + optional `native` → redeem OK; không hiện UI đổi native.
- [ ] Login/register / admin: không regress i18n.
- [ ] Create/edit program + vocab AI generate vẫn chạy (schema `langType` native/study không đổi).
- [ ] Không còn cảnh báo “hai ngôn ngữ trùng”.

---

## 6. Rủi ro / follow-up (meup-web)

| Rủi ro | Xử lý |
|--------|--------|
| User cũ đã có native ≠ `vi` trong account/session | Giữ giá trị đó (read-only); UI không cho đổi. Không force `vi` khi đã có. |
| UI chỉ tiếng Việt khi native = `vi` | Đúng với model hiện tại. Muốn đổi UI locale → task riêng. |
| Product/list gắn pair native khác `vi` | User vẫn thấy nếu session/account còn native đó. Chỉ khi thiếu native mới fallback `vi`. |

### 6.1 Khuyến nghị chốt trước khi code

> **Native nguồn giá trị (ưu tiên):**  
> 1) QR/path nếu có → 2) account prefs nếu có → 3) sessionStorage → 4) `DEFAULT_NATIVE_LANG` (`vi`).  
> **Không** có bước 0 = user picker.

---

## 7. Tóm tắt file đụng tay (checklist PR)

**Phải sửa**

- [ ] `src/components/LanguagePairChip.tsx`
- [ ] `src/context/LanguagePairProvider.tsx`
- [ ] `src/pages/HomePage.tsx`
- [ ] `src/locales/vi.json` / `en.json` (+ partials cần thiết)
- [ ] `src/i18n/types.ts`
- [ ] `README.md`
- [ ] `docs/UX_SCREEN_LAYOUT_PLAN.md` (đoạn pair / Home)

**Nên rà / chỉnh nhẹ copy hoặc comment**

- [ ] `src/context/DeviceSessionProvider.tsx`
- [ ] `src/utils/linkParams.ts`
- [ ] `src/components/Header.tsx` (nếu đổi tên prop/component)
- [ ] `src/pages/ProductsPage.tsx` / `ExplorePage.tsx` / `AiCreatePageShell.tsx` (i18n keys)
- [ ] `docs/PLAN_WEB_API_FLOW_V2.md`

**Không cần đổi logic (chỉ xác nhận vẫn compile)**

- Create/edit program pages, `product.ts`, `productCreate.ts`, vocab components, `langPairId`, schema `langType: 'native'`
