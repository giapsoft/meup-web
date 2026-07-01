import {
  API_AUTH_GOOGLE,
  API_AUTH_LOGIN,
  API_AUTH_ME,
  API_AUTH_REGISTER,
  API_AUTH_VERIFY_EMAIL,
  API_AUTH_VERIFY_RESEND,
} from '../config'
import { apiRequest, storeTokenPair, type TokenPairDto } from './client'
import { langPairFromAccount } from '../utils/accountLangPrefs'
import { saveDeviceSession } from '../utils/deviceSessionStorage'

/** Thông tin tài khoản trả về từ `/api/auth/me`, `/resend`, PATCH `/me`, login và register. */
export type AccountDto = {
  userId: string
  email: string
  emailVerified: boolean
  nativeLangCode: string
  studyLangCode: string
  creditBalance: number
}

/** Token + userId + lang prefs + credits từ `/api/auth/login` và `/api/auth/register`. */
export type EmailSessionDto = TokenPairDto & {
  userId: string
  nativeLangCode: string
  studyLangCode: string
  creditBalance: number
}

function applySessionLangPrefs(session: EmailSessionDto): void {
  const pair = langPairFromAccount({
    nativeLangCode: session.nativeLangCode,
    studyLangCode: session.studyLangCode,
  })
  if (pair) {
    saveDeviceSession(pair)
  }
}

/**
 * Đăng ký tài khoản web bằng email + mật khẩu. Thành công → server trả cặp token + userId +
 * nativeLangCode/studyLangCode (có thể rỗng nếu chưa set) và phiên được lưu ngay.
 */
export async function registerEmail(email: string, password: string): Promise<EmailSessionDto> {
  const res = await apiRequest<EmailSessionDto>(API_AUTH_REGISTER, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(res)
  applySessionLangPrefs(res)
  return res
}

/**
 * Đăng nhập bằng email + mật khẩu. Thành công → lưu phiên + áp lang prefs nếu hợp lệ.
 */
export async function loginEmail(email: string, password: string): Promise<EmailSessionDto> {
  const res = await apiRequest<EmailSessionDto>(API_AUTH_LOGIN, {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
  storeTokenPair(res)
  applySessionLangPrefs(res)
  return res
}

/** Đăng nhập bằng Google ID token từ Sign In With Google. */
export async function loginGoogle(idToken: string): Promise<EmailSessionDto> {
  const res = await apiRequest<EmailSessionDto>(API_AUTH_GOOGLE, {
    method: 'POST',
    body: { idToken },
    auth: false,
  })
  storeTokenPair(res)
  applySessionLangPrefs(res)
  return res
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
