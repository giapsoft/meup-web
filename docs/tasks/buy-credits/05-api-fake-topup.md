# 05 — API: fake instructor + JWT topup

**Repo:** `meup-api`  
**Phụ thuộc:** 02, 03 (wire complete checkout khi 06 sẵn)  
**Plan:** §7.3 fake

## Mục tiêu

Nạp thử an toàn cho local/dev.

## Việc cần làm

1. Fake `CheckoutInstructor` (`method=none`).
2. `POST /api/payment/fake/topup` — JWT user; flag `ALLOW_FAKE_PAYMENT_PROVIDER`; body checkoutId/packageId.
3. Fulfill + complete checkout.
4. Tests flag on/off.

## Done khi

- [x] Không topup arbitrary userId từ body (lấy từ JWT).
- [x] `BuildInstructions` method=none khi flag bật.
- [x] `POST /api/payment/fake/topup` (complete checkout gắn ở task 06).
