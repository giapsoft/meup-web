# 02 — API: `CREDIT_PACKAGE_MONTHLY` / `_YEARLY` + lookup

**Repo:** `meup-api`  
**Phụ thuộc:** 01 (FK đã drop)  
**Plan:** §2

## Mục tiêu

Mỗi gói một key `system_config`; fulfill/list đọc từ đây.

## Việc cần làm

1. Keys `CREDIT_PACKAGE_MONTHLY`, `CREDIT_PACKAGE_YEARLY` (json) trong `keys.go` + admin `catalog.go` + default §1.1 (mỗi key = một object gói).
2. Parse/validate helper per key (`id` khớp, amount, priceVnd, term, monthCount, active).
3. `LookupPackage` / `PackageAmount` / fulfill: `monthly` → key monthly, `yearly` → key yearly.
4. List active = đọc cả hai key.
5. Cache: tôn trọng TTL system_config; document đổi giá có thể trễ ~cache.
6. Tests: default khi trống; get từng gói; id lạ → not found.

## Done khi

- [x] Fulfill resolve amount từ đúng key, không `SELECT credit_package`.
- [x] Admin PUT từng key nhận JSON hợp lệ / từ chối JSON xấu.
- [x] Unit tests parse/default/list + admin validate.

## Không làm

Checkout HTTP; deprecate sync endpoint (task 07).
