import { API_BASE_URL, API_PRODUCT_CREATE } from '../config'
import { ApiError, ensureAccessToken } from './client'
import type { SchemaAttrWeb } from '../types/webConfig'

export type InstantMediaResult = {
  objectKey: string
  previewUrl: string
}

export type GenerateDescriptionResult = {
  attrs: SchemaAttrWeb[]
}

type Envelope<T> = {
  ok: boolean
  data?: T
  error?: string
}

const REQUEST_TIMEOUT_MS = 30_000

async function parseEnvelope<T>(res: Response): Promise<T> {
  let payload: Envelope<T>
  try {
    payload = (await res.json()) as Envelope<T>
  } catch {
    throw new ApiError(res.status, 'invalid_json')
  }
  if (!res.ok || !payload.ok || payload.data === undefined) {
    throw new ApiError(res.status, payload.error ?? 'request_failed')
  }
  return payload.data
}

async function authJsonRequest<T>(path: string, body: unknown): Promise<T> {
  const token = await ensureAccessToken()
  if (!token) {
    throw new ApiError(401, 'unauthorized')
  }
  const res = await fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  return parseEnvelope<T>(res)
}

async function authMultipartRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = await ensureAccessToken()
  if (!token) {
    throw new ApiError(401, 'unauthorized')
  }
  const res = await fetch(API_BASE_URL + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  return parseEnvelope<T>(res)
}

export async function generateProductCreateAudio(input: {
  tempId: string
  text: string
  lang: string
}): Promise<InstantMediaResult> {
  return authJsonRequest<InstantMediaResult>(`${API_PRODUCT_CREATE}/generate-audio`, input)
}

export async function generateProductCreateImage(input: {
  tempId: string
  text: string
  lang?: string
}): Promise<InstantMediaResult> {
  return authJsonRequest<InstantMediaResult>(`${API_PRODUCT_CREATE}/generate-image`, input)
}

export async function generateProductCreateDescription(input: {
  attrs: SchemaAttrWeb[]
  /** When set, fill or upgrade these keys only (still send full attrs for context). */
  keys?: string[]
}): Promise<GenerateDescriptionResult> {
  return authJsonRequest<GenerateDescriptionResult>(`${API_PRODUCT_CREATE}/generate-description`, input)
}

export async function uploadProductCreateAudio(tempId: string, file: File): Promise<InstantMediaResult> {
  const form = new FormData()
  form.append('tempId', tempId)
  form.append('file', file)
  return authMultipartRequest<InstantMediaResult>(`${API_PRODUCT_CREATE}/upload-audio`, form)
}

export async function uploadProductCreateImage(tempId: string, file: File): Promise<InstantMediaResult> {
  const form = new FormData()
  form.append('tempId', tempId)
  form.append('file', file)
  return authMultipartRequest<InstantMediaResult>(`${API_PRODUCT_CREATE}/upload-image`, form)
}

export async function cancelProductCreateManual(tempId: string): Promise<void> {
  await authJsonRequest<{ ok: boolean }>(`${API_PRODUCT_CREATE}/cancel-manual`, { tempId })
}
