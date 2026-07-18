# 13 — Web: Admin form sửa 2 credit packages

**Repo:** `meup-web`  
**Phụ thuộc:** 02 (2 key config tồn tại), 07 (deprecate sync cũ)  
**Plan:** §8.1

## Mục tiêu

UI Admin **riêng** để sửa gói tháng / năm (không bắt sửa JSON thô trên Config).

## Việc cần làm

1. Thay tab **Packages** trên `AdminPanelPage` (hoặc section tương đương):
   - Hai form cố định: Monthly / Yearly
   - Fields: `name`, `amount`, `priceVnd`, `active`
   - `id` / `term` / `monthCount`: read-only hoặc ẩn (đúng §1.1)
2. Load: đọc `CREDIT_PACKAGE_MONTHLY` + `CREDIT_PACKAGE_YEARLY` qua `listAdminSystemConfig` (parse JSON).
3. Save: `updateAdminSystemConfig` từng key (hoặc cả hai nếu dirty); validate `amount > 0`, `priceVnd > 0`.
4. Gỡ hoàn toàn flow `syncAdminCreditPackages` / add-remove rows trên tab này.
5. i18n: label `priceVnd`, `active`, save success/error.
6. (Optional) Ẩn hoặc đánh dấu phụ 2 key JSON trên `/admin/config` để tránh sửa nhầm hai nơi — hoặc để nguyên list Config.

## Done khi

- [x] Admin đổi giá/credits trên form → refresh `/credits` (user) thấy đúng (sau cache).
- [x] Không còn nút Sync full catalog kiểu cũ trên tab Packages.
