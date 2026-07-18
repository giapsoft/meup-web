# 06 — API: GET packages + checkout endpoints

**Repo:** `meup-api`  
**Phụ thuộc:** 01–05  
**Plan:** §6–7.3

## Mục tiêu

HTTP đủ cho web: list gói (config), tạo/poll checkout.

## Việc cần làm

1. Store findOrCreate / complete `credit_checkout`.
2. `GET /api/credit-packages` (auth) ← config.
3. `POST /api/payment/checkout`, `GET /api/payment/checkout/{id}`.
4. Sau fulfill: mark checkout completed.
5. Postman smoke local + fake.

## Done khi

- [ ] list → checkout → fake → poll `completed`.
