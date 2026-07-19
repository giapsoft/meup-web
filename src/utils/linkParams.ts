import { LANGUAGES } from '../data/mock'
import { DEFAULT_NATIVE_LANG, DEFAULT_STUDY_LANG, normalizeLangCode } from './langCode'

export { DEFAULT_NATIVE_LANG, DEFAULT_STUDY_LANG, normalizeLangCode } from './langCode'

export function isKnownLangCode(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code)
}

export function resolveLangCode(code: string | null | undefined, fallback: string): string {
  const normalized = normalizeLangCode(code)
  if (normalized && isKnownLangCode(normalized)) {
    return normalized
  }
  return fallback
}

export type LangPair = {
  nativeLangCode: string
  studyLangCode: string
}

/**
 * Kết quả parse path QR device-link.
 *
 * Thứ tự trên path (NGOẠI LỆ vs codebase): Study → Native → deviceOrder → tempHash(6).
 * Lang code 2 hoặc 3 ký tự — tách theo độ dài vùng chữ cái (xem `splitLangRegion`).
 */
export type ParsedDeviceLink = {
  studyLangCode: string | null
  nativeLangCode: string | null
  deviceOrder: number
  tempHash: string
  /** Mã gửi `POST /api/device/link/redeem`: `"<deviceOrder>-<tempHash>"`. */
  redeemCode: string
}

const TEMP_HASH_RE = /^[A-Za-z0-9_-]{6}$/
const ORDER_RE = /^\d+$/

/**
 * Tách study/native từ vùng chữ cái trước deviceOrder.
 *
 * | Độ dài | Nghĩa |
 * | 0 | không lang |
 * | 2 hoặc 3 | chỉ study |
 * | 4 | study 2 + native 2 |
 * | 5 | thử study3+native2, rồi study2+native3 (cả hai phải valid catalog) |
 * | 6 | study 3 + native 3 |
 * | khác | không lấy lang (study/native null) — vẫn có thể redeem nếu order/hash OK |
 */
export function splitLangRegion(region: string): {
  studyLangCode: string | null
  nativeLangCode: string | null
} {
  const n = region.length
  if (n === 0) {
    return { studyLangCode: null, nativeLangCode: null }
  }
  if (n === 2 || n === 3) {
    return {
      studyLangCode: isKnownLangCode(region) ? region : null,
      nativeLangCode: null,
    }
  }
  if (n === 4) {
    const study = region.slice(0, 2)
    const native = region.slice(2, 4)
    return {
      studyLangCode: isKnownLangCode(study) ? study : null,
      nativeLangCode: isKnownLangCode(native) ? native : null,
    }
  }
  if (n === 5) {
    const aStudy = region.slice(0, 3)
    const aNative = region.slice(3, 5)
    if (isKnownLangCode(aStudy) && isKnownLangCode(aNative)) {
      return { studyLangCode: aStudy, nativeLangCode: aNative }
    }
    const bStudy = region.slice(0, 2)
    const bNative = region.slice(2, 5)
    if (isKnownLangCode(bStudy) && isKnownLangCode(bNative)) {
      return { studyLangCode: bStudy, nativeLangCode: bNative }
    }
    return { studyLangCode: null, nativeLangCode: null }
  }
  if (n === 6) {
    const study = region.slice(0, 3)
    const native = region.slice(3, 6)
    return {
      studyLangCode: isKnownLangCode(study) ? study : null,
      nativeLangCode: isKnownLangCode(native) ? native : null,
    }
  }
  return { studyLangCode: null, nativeLangCode: null }
}

/**
 * Parse path QR dạng `/[study?][native?][order][mac6]`.
 * Format cũ `/<order>-<mac>` → null (đã bỏ triệt để).
 */
export function parseDeviceLinkPath(pathname: string): ParsedDeviceLink | null {
  const seg = pathname.replace(/^\/+/, '').split('/')[0]?.trim() ?? ''
  if (seg.length < 1 + 6) {
    return null
  }

  const tempHash = seg.slice(-6)
  if (!TEMP_HASH_RE.test(tempHash)) {
    return null
  }

  const body = seg.slice(0, -6)
  if (!body) {
    return null
  }

  let i = 0
  while (i < body.length && /[a-z]/.test(body[i])) {
    i += 1
  }
  // Vùng lang tối đa 6 ký tự (hai mã 3).
  if (i > 6) {
    return null
  }

  const langRegion = body.slice(0, i)
  const deviceOrderStr = body.slice(i)
  if (!ORDER_RE.test(deviceOrderStr)) {
    return null
  }
  const deviceOrder = Number.parseInt(deviceOrderStr, 10)
  if (!Number.isFinite(deviceOrder) || deviceOrder <= 0) {
    return null
  }

  const { studyLangCode, nativeLangCode } = splitLangRegion(langRegion)

  return {
    studyLangCode,
    nativeLangCode,
    deviceOrder,
    tempHash,
    redeemCode: `${deviceOrderStr}-${tempHash}`,
  }
}

/** Redeem code từ path QR mới, hoặc null. */
export function getPathRedeemCode(pathname: string): string | null {
  return parseDeviceLinkPath(pathname)?.redeemCode ?? null
}

/**
 * Cặp ngôn ngữ khi **không** có path QR (login email / vào app thường):
 * query → stored → default.
 */
export function resolveLangPair(
  searchParams: URLSearchParams,
  stored: LangPair | null,
): LangPair {
  const nativeRaw = searchParams.get('nativeLangCode')
  const studyRaw = searchParams.get('studyLangCode')
  return {
    nativeLangCode: nativeRaw
      ? resolveLangCode(nativeRaw, DEFAULT_NATIVE_LANG)
      : (stored?.nativeLangCode ?? DEFAULT_NATIVE_LANG),
    studyLangCode: studyRaw
      ? resolveLangCode(studyRaw, DEFAULT_STUDY_LANG)
      : (stored?.studyLangCode ?? DEFAULT_STUDY_LANG),
  }
}

/**
 * Áp lang từ path QR đã parse.
 * - study: từ path hoặc `""` (caller hiện gate chọn study)
 * - native: từ path hoặc fallback `vi`
 */
export function langPairFromDeviceLink(parsed: ParsedDeviceLink): LangPair {
  return {
    studyLangCode: parsed.studyLangCode ?? '',
    nativeLangCode: parsed.nativeLangCode ?? DEFAULT_NATIVE_LANG,
  }
}

/** Mã link dùng-một-lần từ QR URL (`?authCode=...`), hoặc null nếu không có. */
export function getAuthCode(searchParams: URLSearchParams): string | null {
  const code = searchParams.get('authCode')?.trim()
  return code ? code : null
}
