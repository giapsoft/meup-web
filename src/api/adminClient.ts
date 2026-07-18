import { API_BASE_URL } from '../config'
import { ApiError } from './client'

type Envelope<T> = {
  ok: boolean
  data?: T
  error?: string
}

type AdminRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT'
  body?: unknown
}

/** Gọi `/api/admin/*` với header `X-Admin-Secret`. */
export async function adminRequest<T>(
  secret: string,
  path: string,
  opts: AdminRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body } = opts
  let res: Response
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers: {
        'X-Admin-Secret': secret.trim(),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
    // body không phải JSON hợp lệ
  }

  if (!res.ok || !envelope || envelope.ok !== true) {
    throw new ApiError(res.status, envelope?.error ?? 'request_failed')
  }
  return envelope.data as T
}

/** Multipart admin call — do not set Content-Type (browser sets boundary). */
export async function adminRequestForm<T>(secret: string, path: string, form: FormData): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_BASE_URL + path, {
      method: 'POST',
      headers: {
        'X-Admin-Secret': secret.trim(),
      },
      body: form,
    })
  } catch {
    throw new ApiError(0, 'network_error')
  }

  let envelope: Envelope<T> | null = null
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch {
    // body không phải JSON hợp lệ
  }

  if (!res.ok || !envelope || envelope.ok !== true) {
    throw new ApiError(res.status, envelope?.error ?? 'request_failed')
  }
  return envelope.data as T
}
