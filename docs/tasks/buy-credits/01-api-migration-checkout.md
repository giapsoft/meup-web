# 01 — API: migration `credit_checkout` + drop FK

**Repo:** `meup-api`  
**Phụ thuộc:** Q16 = **A** (đã chốt)  
**Plan:** §7.1

## Mục tiêu

Bảng session checkout để poll; gỡ FK package để lookup chuyển sang config (task 02).

## Việc cần làm

1. Tạo `credit_checkout` (id TEXT PK — app/`gen_random_uuid()::text`, user_id, credit_package_id TEXT, provider, amount_vnd, credit_amount, transfer_content NULL, status ∈ pending|completed|expired|cancelled, credit_purchase_id NULL, created_at, completed_at, expires_at).
2. Index `(user_id, credit_package_id, provider, status)`.
3. Drop FK `credit_purchase.credit_package_id` → `credit_package` (cột TEXT giữ nguyên).
4. Down migration tương ứng.
5. Không đụng logic fulfill ngoài schema; **không** thêm `price_vnd` lên `credit_package`.

## Done khi

- [ ] Migrate up/down sạch.
- [ ] Insert `credit_purchase` với `credit_package_id` không còn row trong `credit_package` vẫn được (FK đã drop).

## Không làm

`CREDIT_PACKAGE_*` config (task 02), HTTP, payment instructor.
