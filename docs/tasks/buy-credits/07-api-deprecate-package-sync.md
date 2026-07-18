# 07 — API: deprecate admin credit-packages sync

**Repo:** `meup-api`  
**Phụ thuộc:** 02 (lookup đã từ config)  
**Plan:** §2.3

## Mục tiêu

Không còn hai nguồn catalog.

## Việc cần làm

1. `PUT /api/admin/credit-packages`: deprecated — 410 hoặc no-op documented; ưu tiên remove khỏi router nếu web đã chuyển.
2. Không ghi `credit_package` từ admin sync nữa.
3. Docs ghi: sửa gói qua `CREDIT_PACKAGE_MONTHLY` / `CREDIT_PACKAGE_YEARLY`.

## Done khi

- [x] Một SoT: system_config.
- [x] Fulfill không phụ thuộc row active trong bảng package.
- [x] `PUT /api/admin/credit-packages` → 410 `endpoint_gone`; `SyncPackages` removed.
