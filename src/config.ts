/** Base URL của meup-api. Override bằng env VITE_API_BASE_URL khi build/dev. */
const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080'

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

/** Web đổi mã link (từ QR) lấy cặp token. */
export const API_DEVICE_LINK_REDEEM = '/api/device/link/redeem'

/** Web gia hạn access token bằng refresh token. */
export const API_AUTH_REFRESH = '/api/auth/refresh'

/** Đăng ký tài khoản web bằng email + mật khẩu. */
export const API_AUTH_REGISTER = '/api/auth/register'

/** Đăng nhập bằng email + mật khẩu. */
export const API_AUTH_LOGIN = '/api/auth/login'

/** Xác thực email bằng token (từ link trong mail). */
export const API_AUTH_VERIFY_EMAIL = '/api/auth/verify-email'

/** Gửi lại mail xác thực (cần đăng nhập). */
export const API_AUTH_VERIFY_RESEND = '/api/auth/verify-email/resend'

/** Thông tin tài khoản phiên hiện tại (cần đăng nhập). */
export const API_AUTH_ME = '/api/auth/me'

/** Tạo bộ từ vựng (create_product_request). */
export const API_PRODUCT_CREATE = '/api/product-create'

/** Poll tiến độ tạo bộ từ — path prefix, thêm `/{requestId}/progress`. */
export const API_PRODUCT_CREATE_PROGRESS = '/api/product-create'

/** Owner cập nhật metadata marketplace (shareMode, creditPrice, …). */
export const API_PRODUCT_SETTINGS = '/api/product/settings'

/** Seller xem giao dịch bán (JWT). */
export const API_SELLER_PAYOUT_SALES = '/api/seller-payout/sales'

/** Seller xem lịch sử thanh toán (JWT). */
export const API_SELLER_PAYOUT_HISTORY = '/api/seller-payout/history'

/** Khoảng đệm (ms) coi access token là "sắp hết hạn" để refresh trước, tránh lỗi 401. */
export const ACCESS_TOKEN_SKEW_MS = 30_000
