# Tasks: Mua / nạp credits

Spec: [`../PLAN_BUY_CREDITS.md`](../PLAN_BUY_CREDITS.md) — `CREDIT_PACKAGE_MONTHLY` + `CREDIT_PACKAGE_YEARLY`.

**Blocker:** không (Q16 = **A** đã chốt).

Làm theo số. Repo ghi trên từng file.

| # | File | Repo | Ghi chú |
|---|------|------|---------|
| 01 | [01-api-migration-checkout.md](./01-api-migration-checkout.md) | meup-api | `credit_checkout` + drop FK `credit_purchase`→`credit_package` |
| 02 | [02-api-credit-packages-config.md](./02-api-credit-packages-config.md) | meup-api | `CREDIT_PACKAGE_MONTHLY` / `_YEARLY` + lookup |
| 03 | [03-api-payment-contract.md](./03-api-payment-contract.md) | meup-api | `CheckoutInstructor` trên registry hiện có |
| 04 | [04-api-sepay-instructor.md](./04-api-sepay-instructor.md) | meup-api | QR + verify amount vs config |
| 05 | [05-api-fake-topup.md](./05-api-fake-topup.md) | meup-api | JWT fake topup |
| 06 | [06-api-checkout-endpoints.md](./06-api-checkout-endpoints.md) | meup-api | GET packages + checkout HTTP |
| 07 | [07-api-deprecate-package-sync.md](./07-api-deprecate-package-sync.md) | meup-api | Deprecate admin credit-packages sync |
| 08 | [08-api-docs-env.md](./08-api-docs-env.md) | meup-api | Docs / env / Postman |
| 09 | [09-web-api-client.md](./09-web-api-client.md) | meup-web | Client |
| 10 | [10-web-credits-page.md](./10-web-credits-page.md) | meup-web | `/credits` |
| 11 | [11-web-checkout-dialog.md](./11-web-checkout-dialog.md) | meup-web | Dialog QR + poll |
| 12 | [12-web-header-drawer-i18n.md](./12-web-header-drawer-i18n.md) | meup-web | Entry + i18n |
| 13 | [13-web-admin-config.md](./13-web-admin-config.md) | meup-web | Form Admin riêng 2 gói (system-config) |
| 14 | [14-staging-e2e-docs.md](./14-staging-e2e-docs.md) | cả hai | E2E SePay + gap docs |

**Gói mặc định**

| id | amount | priceVnd | monthCount |
|----|--------|----------|------------|
| `monthly` | 500 | 50000 | 1 |
| `yearly` | 700 | 500000 | 12 |
