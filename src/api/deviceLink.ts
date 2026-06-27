import { API_DEVICE_LINK_REDEEM } from '../config'
import { apiRequest, storeTokenPair, type TokenPairDto } from './client'

// Gộp các lần redeem cùng một mã (StrictMode mount kép / nhiều tab effect) thành 1 request,
// vì mã link là single-use: gọi lần 2 sẽ bị server từ chối (đã consume).
let redeemInFlight: { code: string; promise: Promise<void> } | null = null

/**
 * Đổi mã link (từ QR) lấy cặp token và lưu phiên. Ném ApiError nếu mã sai/hết hạn/đã dùng.
 */
export function redeemLink(code: string): Promise<void> {
  if (redeemInFlight && redeemInFlight.code === code) {
    return redeemInFlight.promise
  }
  const promise = (async () => {
    const pair = await apiRequest<TokenPairDto>(API_DEVICE_LINK_REDEEM, {
      method: 'POST',
      body: { code },
      auth: false,
    })
    storeTokenPair(pair)
  })().finally(() => {
    if (redeemInFlight?.code === code) {
      redeemInFlight = null
    }
  })
  redeemInFlight = { code, promise }
  return promise
}
