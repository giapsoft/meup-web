import {
  API_AUTH_LOGIN,
  API_AUTH_ME,
  API_AUTH_REGISTER,
  API_AUTH_VERIFY_EMAIL,
  API_AUTH_VERIFY_RESEND,
} from '../config'
import { apiRequest, storeTokenPair, type TokenPairDto } from './client'

/** Thông tin tài khoản trả về từ `/api/auth/me`, `/resend`, và PATCH `/me`. */
export type AccountDto = {
  userId: string
  email: string
  emailVerified: boolean
  nativeLangCode: string
  studyLangCode: string
}

/** Cặp token + userId trả về từ `/api/auth/login` và `/api/auth/register`. */
type EmailSessionDto = TokenPairDto & {
  userId: string
}

/**
 * Đăng ký tài khoản web bằng email + mật khẩu. Thành công → server trả cặp token + userId và
 * phiên được lưu ngay (auto đăng nhập). Ném ApiError với `code` (vd. email_taken, weak_password).
 * Trả về userId để caller lưu vào context/state.
 */
export async function registerEmail(email: string, password: string): Promise<string> {
  const res = await apiRequest<EmailSessionDto>(API_AUTH_REGISTER, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(res)
  return res.userId
}

/**
 * Đăng nhập bằng email + mật khẩu. Thành công → lưu phiên. Sai thông tin → ApiError với
 * `code` = invalid_credentials. Trả về userId để caller lưu vào context/state.
 */
export async function loginEmail(email: string, password: string): Promise<string> {
  const res = await apiRequest<EmailSessionDto>(API_AUTH_LOGIN, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(res)
  return res.userId
}

/** Xác thực email bằng token từ link. Public (không cần đăng nhập). */
export async function verifyEmailToken(token: string): Promise<void> {
  await apiRequest<{ verified: boolean }>(API_AUTH_VERIFY_EMAIL, {
    method: 'POST',
    body: { token },
    auth: false,
  })
}

/** Lấy thông tin tài khoản phiên hiện tại (email + trạng thái xác thực + ngôn ngữ). */
export async function getAccount(): Promise<AccountDto> {
  return apiRequest<AccountDto>(API_AUTH_ME, { method: 'GET' })
}

/** Gửi lại mail xác thực. Trả về trạng thái tài khoản hiện tại. */
export async function resendVerification(): Promise<AccountDto> {
  return apiRequest<AccountDto>(API_AUTH_VERIFY_RESEND, { method: 'POST' })
}

/** Cập nhật lựa chọn ngôn ngữ của tài khoản hiện tại. */
export async function updateLangPrefs(
  nativeLangCode: string,
  studyLangCode: string,
): Promise<AccountDto> {
  return apiRequest<AccountDto>(API_AUTH_ME, {
    method: 'PATCH',
    body: { nativeLangCode, studyLangCode },
  })
}
