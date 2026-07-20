# Kế hoạch: Schema Attr — chỉ còn `key` (identity + chữ hiển thị)

> **Trạng thái:** Implemented (code) — 2026-07-20.  
> **Phạm vi:** meup-web · meup-api · meup (firmware) · docs/plans  
> **Mức:** **B** — bỏ `name` / `label`; user gõ gì vào ô trường thì đó chính là `key` (identity + display).  
> **Ngoài phạm vi:** legacy data, migration, dual-read, backward-compat payload cũ.

---

## 1. Quyết định sản phẩm

| Quyết định | Chi tiết |
|------------|----------|
| Một field duy nhất | Schema attr chỉ còn **`key`** làm identity **và** chữ hiển thị (header bảng, CSV, slot layout, AI prompt, UI device). |
| Bỏ hẳn | `name` (meup-web runtime), `label` (API web JSON / editor). Không còn mapping `label ↔ name`. |
| `description` | **Giữ** optional — đang dùng trong prompt AI; **không** bỏ. Không phải display name của cột. |
| Ai nhập `key` | User gõ trực tiếp trên schema editor. Không auto-generate `attr_<hex>` cho field mới. |
| Charset | **Chữ cái / chữ số Unicode** (mọi ngôn ngữ) **+ khoảng trắng** (` ` U+0020, kể cả giữa từ). **Cấm** dấu câu / ký hiệu (`. , : \` ! # @ % $ _ -` tab/newline …). Dấu thanh trên chữ (á, ề, 漢字) → **được**. |
| Độ dài | Sau `trim`: **1–30** Unicode code points (rune), không phải UTF-16 code unit. |
| Reserved `image` | So khớp **case-insensitive** (`image` / `Image` / `IMAGE` … đều cấm). |
| Ràng buộc bắt buộc | Charset + độ dài (§5); **unique** trong schema; deny-list `image` (ci). |
| Đổi `key` | Chỉ khi **tạo mới** (schema còn editable). Product đã tạo: **cấm sửa schema** — chỉ levels/sides/… |
| Preset (study / native / ipa) | Key mặc định = chuỗi i18n có khoảng trắng OK (vd. `Tên từ vựng`, `Vocabulary`) miễn ≤30 và charset hợp lệ. User được sửa **lúc tạo**. |
| Default card sides | Bind theo **`langType`**, không hardcode `studyText` / `nativeText` / `ipa`. |
| Compact / device | Wire vẫn `[key, type, langType]`. Ship đủ 3 repo; firmware = validate + UI (xem §4.4). |
| Legacy | **Không migration** — payload/default config còn `label` chấp nhận gãy / cập nhật tay. |

### 1.1 Ngoài phạm vi

- Migration / dual-read `label` → `key`.
- Giữ `generateSchemaKey()` làm identity ẩn song song với display.

---

## 2. Model mục tiêu

```text
SchemaAttr {
  key         string   // identity + display (user-authored)
  type        text | text+audio
  langType?   native | study
  description? string  // optional AI hint only
}
```

| Layer | Shape |
|-------|--------|
| meup-web `SchemaAttr` / `SchemaFieldRow` | `key` + `type`/`uiType` + `langType?` + `description?` — **không** `name` / `label` |
| meup-api `SchemaAttr` / `SchemaAttrWeb` |同上 — JSON web: `{ key, type, langType?, description? }` |
| Compact / firmware | `{ key, type, langType }` (không description) |

Display mọi nơi: `attr.key` (sau `trim`). Không còn `DisplayLabel()` ưu tiên label.

---

## 3. UX mục tiêu

```text
Schema editor
  [drag] [ input: key (bắt buộc) ] [ role: study/native/text ] [desc AI?] [x]
        ↓
Vocab table / CSV header / layout slot label / AI field name
        = đúng chuỗi key user đã gõ
```

- Placeholder / aria: đổi copy từ “field label” → “tên trường” / “field key” (i18n).
- Validation schema step: mọi hàng theo §5 + unique; vẫn ≥1 attr có `langType` native|study.
- Field mới: `key: ''` — user phải nhập trước khi Next.

---

## 4. Inventory thay đổi

### 4.1 meup-web — types & mapping

| File | Việc cần làm |
|------|----------------|
| `src/types/program.ts` | `SchemaAttr`: bỏ `name`. `SchemaFieldRow`: bỏ `label`; comment `key` = user-facing identity. |
| `src/types/webConfig.ts` | `SchemaAttrWeb`: bỏ `label`. |
| `src/utils/schemaField.ts` | Bỏ / ngừng dùng `generateSchemaKey` cho flow chính. `itemSchemaFromEditor`: `key: row.key.trim()`. Preset: `key` = bản dịch (truyền locale vào factory) hoặc key tạm từ `t(labelKey)`. |
| `src/utils/programConfigWeb.ts` | Bỏ `name`/`label` bridge; round-trip chỉ `key` (+ description/type/langType). |
| `src/utils/customConfigState.ts` | Editor row từ web: `key` trực tiếp, không `label: … \|\| key`. |
| `src/utils/customConfigValidation.ts` | Validate `key` theo §5 (charset + length 1–30 + unique + `image` ci) thay vì `label`. |
| `src/utils/compactProgramConfig.ts` | Unmarshal: chỉ `{ key, type, langType }` — không gán `name: key`. |
| `src/utils/importPackageToEditDraft.ts` | Bỏ `mapSchemaLabelsFromCompact` / logic name≠key. |
| `src/utils/productEditDraft.ts` | Bỏ migrate `name` → `label` trên editor rows (không dual-field). |
| `src/utils/vocabCsv.ts` | Header / match cột chỉ theo `key`. |
| `src/utils/itemSchemaLayout.ts` | `layoutSlotLabel` → `attr.key`. |
| `src/utils/defaultSides.ts` | Resolve face/play theo `langType` (study/native) hoặc attr text+audio đầu tiên — **không** `layoutKey: 'studyText'`. |
| `src/utils/manualMedia.ts` | Giữ `` `${attrKey}:audio` ``; an toàn vì charset cấm `:` / punctuation trong key. |

### 4.2 meup-web — UI

| File | Việc cần làm |
|------|----------------|
| `src/pages/create-program/SchemaFieldList.tsx` | Input bind `row.key`; i18n placeholder/aria theo key. |
| `src/pages/create-program/ItemSchemaEditor.tsx` | `fieldsToAttrs` / AI description: dùng `key`, bỏ `label`. Khi đổi key trên row đã có vocab — remap `values` keys trong parent nếu editor expose callback (hoặc xử lý ở EditProgramPage). |
| `src/components/create/ProgramConfigWizard.tsx` | Gate bước schema theo rule key mới. |
| `src/components/create/VocabEntryTable.tsx` | Header / placeholder = `attr.key`. |
| `src/pages/create-program/DisplayElementEditorPanel.tsx` (và chỗ slot label) | Hiện `key`. |
| `src/pages/admin/AdminDefaultProgramConfigPage.tsx` | Default attrs: key = chuỗi hiển thị mong muốn (EN/VI theo default config API), không còn cặp key máy + label. |
| `src/locales/en.json` / `vi.json` + `src/i18n/types.ts` | Đổi copy “label” → “key” / “tên trường”; cập nhật validation messages (bỏ nhắc `studyText` / `nativeText` như machine id nếu không còn). |

### 4.3 meup-api

| File | Việc cần làm |
|------|----------------|
| `internal/jobcontent/item_schema.go` | `SchemaAttr`: bỏ `Label`; **giữ `Description`**. `validateAttrKeys`: §5 + unique + `image` ci. |
| `internal/jobcontent/web_schema.go` | `SchemaAttrWeb`: bỏ `json:"label"`; giữ `description`. `DisplayLabel()` → `Key` (hoặc xóa helper). `StripWebOnlyFields`: strip `Description` trước compact. |
| `internal/jobcontent/web_schema_test.go` + `program_config_test.go` | Không `label`; reject punctuation / length 0 hoặc >30 / `Image`; accept `Tên từ vựng`, `意味`. |
| `internal/jobhandler/vocab_prompt.go` | Prompt dùng `key` (+ description nếu có). |
| `internal/instantmedia/service.go` | Copy prompt “key, label…” → chỉ key (+ description). |
| `internal/productrender/product_chars.go` | Collect chars từ `Key` + `Description` (không `Label`). |
| `internal/webconfig/default_config.go` | Default attrs: `key` = display string mong muốn; xóa field label. |
| `docs/API.md` / `docs/POSTMAN.md` | Document shape mới; xóa `label`. |
| `plans/lib/schema_attr.dart` + `plans/plan.txt` | Comment charset mới: Unicode letter/number only; model chỉ `key`. |

Compact encode/decode (`program_config_compact.go`): **không đổi shape** — xác nhận không còn tham chiếu Label.

### 4.4 meup (firmware) — cần làm gì?

Device **không** còn field `name`/`label` trên SchemaAttr (đã bỏ). User **không** edit schema trên máy — schema đến từ package compact. Việc firmware chủ yếu là **align validate khi load** + **UI hiện `key`** (có thể có khoảng trắng / Unicode, tối đa 30).

| Việc | Chi tiết | Bắt buộc? |
|------|----------|-----------|
| Model / compact | Giữ `{ key, type, langType }` — **không đổi wire**. | Đã xong |
| Validate khi `ItemSchema::make` / load package | Cùng rule §5: charset (L/N + space), length 1–30 runes, unique, deny `image` ci. Package lệch rule → fail rõ ràng thay vì chạy nửa vời. | **Có** |
| UI schema / item detail | Đã show `attr.key` — smoke Unicode + khoảng trắng + truncate nếu UI hẹp. | Smoke |
| Sửa màn hình nhập key | Không có editor schema trên device → **không làm**. | Không |
| Docs/comment còn `name` / `[A-Za-z0-9]` | Xóa / sửa cho khớp. | Có nếu còn |

**Tóm lại firmware:** thêm/chỉnh validate key cho khớp API + kiểm tra hiển thị; **không** phải redesign schema UX trên máy.

### 4.5 Docs chéo repo

| File | Việc cần làm |
|------|----------------|
| `meup-web/docs/PLAN_WEB_API_FLOW_V2.md` | Đoạn compact strip `label` → strip `description` only; web JSON không còn `label`. |
| Plan này | Đánh dấu Done khi ship đủ 3 repo. |

---

## 5. Quy tắc validation (canonical)

Áp dụng **giống nhau** web + API + firmware (khi load schema):

1. `key := trimSpace(raw)` (chỉ cắt đầu/cuối; khoảng trắng **giữa** giữ nguyên).
2. **Độ dài:** số Unicode code points (rune) của `key` ∈ **[1, 30]**.  
   - TS: `[...key].length` (không dùng `key.length` UTF-16).  
   - Go: `utf8.RuneCountInString(key)`.
3. **Charset:** mọi rune ∈ **Letter (`\p{L}`)** ∪ **Number (`\p{N}`)** ∪ **space U+0020**.  
   - Regex: `^[\p{L}\p{N} ]+$` (cờ Unicode).  
   - **Được:** `Tên từ vựng`, `hello`, `日本語`, `Field 1`.  
   - **Cấm:** tab/newline, `_`, `-`, `.`, `,`, `:`, `!`, `#`, `@`, emoji, symbol…  
   - Dấu thanh trên chữ (á, ữ) = Letter → OK.
4. **Reserved:** `strings.EqualFold(key, "image")` → error.
5. Unique trong `itemSchema.attrs` (so khớp exact sau trim; không gộp case — chỉ `image` là ci).
6. `type` ∈ {`text`, `text+audio`}.
7. ≥1 attr có `langType` ∈ {`native`, `study`}.

### 5.1 Implement gợi ý

| Stack | Charset + length |
|-------|------------------|
| meup-web (TS) | `/^[\p{L}\p{N} ]+$/u.test(key)` && `[...key].length` ∈ 1..30 |
| meup-api (Go) | range rune: `IsLetter \|\| IsNumber \|\| r == ' '` + `utf8.RuneCountInString` |
| meup (C++) | Cùng rule khi `ItemSchema::make` / decode compact |

---

## 6. Preset & default sides (chi tiết)

### 6.1 Preset insert

| Preset | `langType` | `uiType` | `key` ban đầu (pass §5, có khoảng trắng OK) |
|--------|------------|----------|----------------|
| Study text+audio | `study` | `text+audio` | VI `Tên từ vựng` / EN `Vocabulary` |
| IPA | — | `text` | `IPA` |
| Native text+audio | `native` | `text+audio` | VI `Ý nghĩa` / EN `Meaning` |

Copy nút preset có thể trùng key mặc định; giá trị ghi schema phải ≤30 rune.

Nếu sau insert user đổi `key`, `langType` giữ nguyên → default sides vẫn resolve đúng qua `langType`.

### 6.2 `defaultSides` algorithm (thay hardcode key)

```text
study face text/audio  → first attr where langType == study
native face text/audio → first attr where langType == native
ipa / extra text       → first attr type text without langType (optional)
image                  → hasImage ? IMAGE_MEDIA_KEY : skip
```

Không còn `layoutKey: 'studyText' | 'nativeText' | 'ipa'`.

---

## 7. AI / export

| Chỗ | Hành vi mới |
|-----|-------------|
| Vocab generation output fields | Object keys = `attr.key` (chuỗi user). |
| Prompt mô tả cột | Dùng `key`; kèm `description` nếu có. |
| Font `chars` | Lấy từ toàn bộ `key` (+ description) — hỗ trợ glyph tiếng Việt/CJK trên key. |

---

## 8. Thứ tự triển khai đề xuất

1. **meup-api** — bỏ `Label`; giữ `Description`; validation §5 + tests + default config + docs.  
2. **meup-web** — types → utils → UI → i18n → defaultSides → admin default config.  
3. **meup** — validate §5 khi load schema + smoke UI key có space/Unicode.  
4. **plans/docs** — charset mới; sync `PLAN_WEB_API_FLOW_V2.md`.

Có thể song song (1)+(2) nếu contract JSON chốt trước (OpenAPI/snippet trong PR API).

---

## 9. Test plan

- [ ] Key Unicode + khoảng trắng (vd. `Tên từ vựng`, `意味`) — pass; hiện đúng table/CSV/layout/device.  
- [ ] Reject: rỗng, >30 rune, dấu câu (`a.b`, `hello!`), `Image`/`IMAGE`, trùng key.  
- [ ] Preset study+native → default sides có text+audio đúng mặt; đổi key preset → sides vẫn đúng (theo langType).  
- [ ] Vocab values + upload audio: media key `` `{key}:audio` `` đúng; compact round-trip giữ key.  
- [ ] AI create / generate-description: prompt không còn “label”; field names = key.  
- [ ] Admin default program config: save/load không còn `label` trong JSON.  
- [ ] Device: mở schema / item detail hiện key Unicode không vỡ layout nghiêm trọng.

---

## 10. Definition of done

- Không còn field `name` / `label` trên Schema Attr ở web types, API web DTO, và docs đang dùng.  
- User chỉ nhập một ô = `key`; mọi UI display lấy từ `key`.  
- Key: Letter/Number/space, length 1–30 rune, `image` ci forbidden (§5).  
- `description` vẫn có trên web/API cho AI; compact không mang description.  
- Compact/device không đổi shape; default sides theo `langType`.  
- Firmware: validate §5 khi load + smoke UI — không schema editor mới.  
- **Không** migration / dual-read legacy.
