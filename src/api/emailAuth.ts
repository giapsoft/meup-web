import {
  API_AUTH_LOGIN,
  API_AUTH_ME,
  API_AUTH_REGISTER,
  API_AUTH_VERIFY_EMAIL,
  API_AUTH_VERIFY_RESEND,
} from '../config'
import { apiRequest, storeTokenPair, type TokenPairDto } from './client'

/** Thông tin tài khoản trả về từ `/api/auth/me` và `/resend`. */
export type AccountDto = {
  email: string
  emailVerified: boolean
}

/**
 * Đăng ký tài khoản web bằng email + mật khẩu. Thành công → server trả cặp token và phiên
 * được lưu ngay (auto đăng nhập). Ném ApiError với `code` (vd. email_taken, weak_password).
 */
export async function registerEmail(email: string, password: string): Promise<void> {
  const pair = await apiRequest<TokenPairDto>(API_AUTH_REGISTER, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(pair)
}

/**
 * Đăng nhập bằng email + mật khẩu. Thành công → lưu phiên. Sai thông tin → ApiError với
 * `code` = invalid_credentials.
 */
export async function loginEmail(email: string, password: string): Promise<void> {
  const pair = await apiRequest<TokenPairDto>(API_AUTH_LOGIN, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(pair)
}

/** Xác thực email bằng token từ link. Public (không cần đăng nhập). */
export async function verifyEmailToken(token: string): Promise<void> {
  await apiRequest<{ verified: boolean }>(API_AUTH_VERIFY_EMAIL, {
    method: 'POST',
    body: { token },
    auth: false,
  })
}

/** Lấy thông tin tài khoản phiên hiện tại (email + trạng thái xác thực). */
export async function getAccount(): Promise<AccountDto> {
  return apiRequest<AccountDto>(API_AUTH_ME, { method: 'GET' })
}

/** Gửi lại mail xác thực. Trả về trạng thái tài khoản hiện tại. */
export async function resendVerification(): Promise<AccountDto> {
  return apiRequest<AccountDto>(API_AUTH_VERIFY_RESEND, { method: 'POST' })
}
