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

/** Lấy cặp ngôn ngữ từ QR URL (ưu tiên), ngược lại dùng phiên đã lưu, cuối cùng là mặc định. */
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

/** Mã link dùng-một-lần từ QR URL (`?authCode=...`), hoặc null nếu không có. */
export function getAuthCode(searchParams: URLSearchParams): string | null {
  const code = searchParams.get('authCode')?.trim()
  return code ? code : null
}

/**
 * Mã link dùng-một-lần dạng path `/<deviceOrder>-<mac>` (vd. `/3-Az64j`), hoặc null.
 * Phân biệt với các route app (đều bắt đầu bằng chữ cái) nhờ pattern `số-...`.
 */
export function getPathAuthCode(pathname: string): string | null {
  const seg = pathname.replace(/^\/+/, '').split('/')[0]
  return /^\d+-[A-Za-z0-9_-]+$/.test(seg) ? seg : null
}
