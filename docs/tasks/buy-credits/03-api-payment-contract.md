# 03 — API: mở rộng payment contract (CheckoutInstructor)

**Repo:** `meup-api`  
**Phụ thuộc:** — (song song 01–02 được)  
**Plan:** §5

## Mục tiêu

Tận dụng `Provider` / `Register` hiện có; thêm mặt checkout, không tạo registry mới.

## Việc cần làm

1. `CheckoutRequest`, `PaymentInstructions`, method constants.
2. `CheckoutInstructor` embed `Provider` + `BuildInstructions`.
3. `PAYMENT_DEFAULT_PROVIDER` env + `GetCheckoutInstructor`.
4. Giữ nguyên `ProcessWebhook` / `Fulfillment`.
5. Test: provider không implement instructor → lỗi rõ.

## Done khi

- [ ] Core không import `sepay`.
- [ ] Webhook path không regress.
