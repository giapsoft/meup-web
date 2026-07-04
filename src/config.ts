/** Base URL của meup-api. Override bằng env VITE_API_BASE_URL khi build/dev. */
function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/+$/, '')
  }

  // Dev: gọi cùng origin (5173), Vite proxy `/api` → meup-api trên máy dev.
  // Tránh gọi thẳng :8080 từ điện thoại (firewall/CORS) và tránh localhost trên thiết bị khác.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return ''
  }

  return 'http://localhost:8080'
}

export const API_BASE_URL = resolveApiBaseUrl()

/** Web đổi mã link (từ QR) lấy cặp token. */
export const API_DEVICE_LINK_REDEEM = '/api/device/link/redeem'

/** Web gia hạn access token bằng refresh token. */
export const API_AUTH_REFRESH = '/api/auth/refresh'

/** Đăng ký tài khoản web bằng email + mật khẩu. */
export const API_AUTH_REGISTER = '/api/auth/register'

/** Đăng nhập bằng email + mật khẩu. */
export const API_AUTH_LOGIN = '/api/auth/login'

/** Đăng nhập bằng Google ID token (Sign In With Google). */
export const API_AUTH_GOOGLE = '/api/auth/google'

/** Xác thực email bằng token (từ link trong mail). */
export const API_AUTH_VERIFY_EMAIL = '/api/auth/verify-email'

/** Gửi lại mail xác thực (cần đăng nhập). */
export const API_AUTH_VERIFY_RESEND = '/api/auth/verify-email/resend'

/** Thông tin tài khoản phiên hiện tại (cần đăng nhập). */
export const API_AUTH_ME = '/api/auth/me'

/** Tạo bộ từ vựng (create_product_request). */
export const API_PRODUCT_CREATE = '/api/product-create'

/** Web pricing, limits, default program config. */
export const API_WEB_CONFIG = '/api/web-config'

/** Poll tiến độ tạo bộ từ — path prefix, thêm `/{requestId}/progress`. */
export const API_PRODUCT_CREATE_PROGRESS = '/api/product-create'

/** Owner cập nhật metadata marketplace (shareMode, creditPrice, …). */
export const API_PRODUCT_SETTINGS = '/api/product/settings'

/** Seller xem giao dịch bán (JWT). */
export const API_SELLER_PAYOUT_SALES = '/api/seller-payout/sales'

/** Seller xem lịch sử thanh toán (JWT). */
export const API_SELLER_PAYOUT_HISTORY = '/api/seller-payout/history'

/** Admin: danh sách số dư seller (header `X-Admin-Secret`). */
export const API_ADMIN_SELLER_BALANCES = '/api/admin/seller-payout/balances'

/** Admin: ghi nhận thanh toán seller. */
export const API_ADMIN_SELLER_RECORD = '/api/admin/seller-payout/record'

/** Admin: đồng bộ catalog gói nạp credits. */
export const API_ADMIN_CREDIT_PACKAGES = '/api/admin/credit-packages'

/** Khoảng đệm (ms) coi access token là "sắp hết hạn" để refresh trước, tránh lỗi 401. */
export const ACCESS_TOKEN_SKEW_MS = 30_000

/** Google OAuth 2.0 Client ID (Web) — khớp một giá trị trong GOOGLE_OAUTH_CLIENT_ID của meup-api. */
export const GOOGLE_OAUTH_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined)?.trim() ?? ''
