# 04 — API: SePay BuildInstructions + verify amount

**Repo:** `meup-api`  
**Phụ thuộc:** 02 (priceVnd từ config), 03  
**Plan:** §5, §7.4

## Mục tiêu

SePay trả QR/bank; webhook từ chối sai tiền so với config.

## Việc cần làm

1. Env bank + optional QR template (chỉ trong sepay package).
2. `BuildInstructions` → `method=bank_transfer_qr`, `MEUP_…`, VietQR URL.
3. Webhook: so amount với `priceVnd` package từ config.
4. Tests.

## Done khi

- [x] Instructions đủ cho UI.
- [x] Sai tiền → không fulfill.
