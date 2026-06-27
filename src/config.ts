/** Base URL của meup-api. Override bằng env VITE_API_BASE_URL khi build/dev. */
const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080'

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

/** Web đổi mã link (từ QR) lấy cặp token. */
export const API_DEVICE_LINK_REDEEM = '/api/device/link/redeem'

/** Web gia hạn access token bằng refresh token. */
export const API_AUTH_REFRESH = '/api/auth/refresh'

/** Khoảng đệm (ms) coi access token là "sắp hết hạn" để refresh trước, tránh lỗi 401. */
export const ACCESS_TOKEN_SKEW_MS = 30_000
