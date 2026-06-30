import { API_AUTH_REFRESH, API_BASE_URL } from '../config'
import {
  accessTokenFresh,
  clearAuthTokens,
  loadAuthTokens,
  refreshTokenFresh,
  saveAuthTokens,
  type AuthTokens,
} from './authTokens'

/** Lỗi chuẩn hoá từ API: `status` HTTP (0 = lỗi mạng) + `code` snake_case từ envelope. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(`api_error ${status} ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Cặp token như API trả về — `*ExpiresAt` là Unix **giây**. */
export type TokenPairDto = {
  accessToken: string
  accessExpiresAt: number
  refreshToken: string
  refreshExpiresAt: number
}

type Envelope<T> = {
  ok: boolean
  time?: number
  data?: T
  error?: string
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  /** Đính `Authorization: Bearer` (mặc định true). Đặt false cho redeem/refresh. */
  auth?: boolean
}

/** Quy đổi cặp token (giây → ms) và lưu lại. Trả về bản đã lưu. */
export function storeTokenPair(pair: TokenPairDto): AuthTokens {
  const tokens: AuthTokens = {
    accessToken: pair.accessToken,
    accessExpiresAt: pair.accessExpiresAt * 1000,
    refreshToken: pair.refreshToken,
    refreshExpiresAt: pair.refreshExpiresAt * 1000,
  }
  saveAuthTokens(tokens)
  return tokens
}

/** Một lần gọi mạng: bóc envelope `{ok,data,error}`, KHÔNG xử lý token. */
async function rawRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    headers,
  }: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network_error')
  }

  let envelope: Envelope<T> | null = null
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch {
    // body không phải JSON hợp lệ → giữ envelope = null
  }

  if (!res.ok || !envelope || envelope.ok !== true) {
    throw new ApiError(res.status, envelope?.error ?? 'request_failed')
  }
  return envelope.data as T
}

// Gộp các lần refresh đồng thời thành 1 request duy nhất (tránh tạo nhiều request).
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const tokens = loadAuthTokens()
  if (!tokens || !refreshTokenFresh(tokens)) {
    clearAuthTokens()
    return null
  }
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const pair = await rawRequest<TokenPairDto>(API_AUTH_REFRESH, {
          method: 'POST',
          body: { refreshToken: tokens.refreshToken },
        })
        return storeTokenPair(pair).accessToken
      } catch {
        clearAuthTokens()
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

/**
 * Trả về access token hợp lệ (refresh ngầm nếu sắp/đã hết hạn), hoặc null nếu không có
 * phiên hợp lệ. Khi đã có token còn hạn thì trả ngay, không gọi mạng.
 */
export async function ensureAccessToken(): Promise<string | null> {
  const tokens = loadAuthTokens()
  if (!tokens) {
    return null
  }
  if (accessTokenFresh(tokens)) {
    return tokens.accessToken
  }
  return refreshAccessToken()
}

/**
 * Kênh gọi API DUY NHẤT cho meup-web. Tự đính Bearer (interceptor tập trung), bóc envelope,
 * và thử lại ĐÚNG 1 lần khi gặp 401 (refresh token rồi gửi lại).
 */
export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts

  if (!auth) {
    return rawRequest<T>(path, { method, body })
  }

  const token = await ensureAccessToken()
  if (!token) {
    throw new ApiError(401, 'unauthorized')
  }

  try {
    return await rawRequest<T>(path, {
      method,
      body,
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const fresh = await refreshAccessToken()
      if (!fresh) {
        throw new ApiError(401, 'unauthorized')
      }
      return rawRequest<T>(path, {
        method,
        body,
        headers: { Authorization: `Bearer ${fresh}` },
      })
    }
    throw err
  }
}
