import { getProductMediaPreview } from '../api/productMedia'
import { isPackageObjectKeyRef, isStoredMediaRef } from './storedMediaRef'

/** Slightly below server signed-URL TTL (15m) so we refresh before expiry. */
const SIGNED_URL_CACHE_TTL_MS = 14 * 60 * 1000

type CachedSignedUrl = {
  url: string
  expiresAtMs: number
}

const signedUrlByRef = new Map<string, CachedSignedUrl>()

/**
 * Resolves a media ref to a URL for `<audio src>` / `<img src>` / `new Audio(url)`.
 * Cross-origin signed URLs work in media elements (no CORS); only `fetch()` is blocked.
 * Package refs call `/api/product/media-preview` once per ref until cache expiry.
 */
export async function resolveMediaPlayUrl(ref: string): Promise<string> {
  const key = ref.trim()
  if (!key || !isStoredMediaRef(key)) {
    throw new Error('invalid_media_ref')
  }
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key
  }
  if (!isPackageObjectKeyRef(key)) {
    throw new Error('unsupported_media_ref')
  }

  const cached = signedUrlByRef.get(key)
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.url
  }

  const { previewUrl } = await getProductMediaPreview(key)
  signedUrlByRef.set(key, {
    url: previewUrl,
    expiresAtMs: Date.now() + SIGNED_URL_CACHE_TTL_MS,
  })
  return previewUrl
}
