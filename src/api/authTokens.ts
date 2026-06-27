import { ACCESS_TOKEN_SKEW_MS } from '../config'

const STORAGE_KEY = 'meup.authTokens'

/** Cặp token phiên web. `*ExpiresAt` là epoch **mili-giây** (đã quy đổi từ giây của API). */
export type AuthTokens = {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

let cache: AuthTokens | null = null

export function loadAuthTokens(): AuthTokens | null {
  if (cache) {
    return cache
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<AuthTokens>
    if (
      typeof parsed.accessToken === 'string' &&
      typeof parsed.accessExpiresAt === 'number' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.refreshExpiresAt === 'number'
    ) {
      cache = parsed as AuthTokens
      return cache
    }
  } catch {
    // ignore corrupt storage
  }
  return null
}

export function saveAuthTokens(tokens: AuthTokens): void {
  cache = tokens
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearAuthTokens(): void {
  cache = null
  sessionStorage.removeItem(STORAGE_KEY)
}

/** Access token còn hạn (trừ đi đệm để refresh sớm). */
export function accessTokenFresh(tokens: AuthTokens): boolean {
  return Date.now() + ACCESS_TOKEN_SKEW_MS < tokens.accessExpiresAt
}

/** Refresh token còn hạn → có thể gia hạn ngầm. */
export function refreshTokenFresh(tokens: AuthTokens): boolean {
  return Date.now() < tokens.refreshExpiresAt
}
