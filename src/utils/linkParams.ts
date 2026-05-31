import { LANGUAGES } from '../data/mock'
import {
  DEFAULT_NATIVE_LANG,
  DEFAULT_STUDY_LANG,
  normalizeLangCode,
} from './langCode'

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

export type LinkParams = {
  nativeLangCode: string
  studyLangCode: string
  authCode: string | null
}

export function parseLinkParams(searchParams: URLSearchParams): LinkParams {
  return {
    nativeLangCode: resolveLangCode(
      searchParams.get('nativeLangCode'),
      DEFAULT_NATIVE_LANG,
    ),
    studyLangCode: resolveLangCode(searchParams.get('studyLangCode'), DEFAULT_STUDY_LANG),
    authCode: searchParams.get('authCode'),
  }
}

/** Merge QR URL params with a saved session (URL wins when present). */
export function mergeEntrySession(
  searchParams: URLSearchParams,
  stored: { authCode: string; nativeLangCode: string; studyLangCode: string } | null,
): { authCode: string; nativeLangCode: string; studyLangCode: string } | null {
  const authCode = searchParams.get('authCode') ?? stored?.authCode ?? null
  if (!authCode) {
    return null
  }

  const nativeRaw = searchParams.get('nativeLangCode')
  const studyRaw = searchParams.get('studyLangCode')

  return {
    authCode,
    nativeLangCode: nativeRaw
      ? resolveLangCode(nativeRaw, DEFAULT_NATIVE_LANG)
      : (stored?.nativeLangCode ?? DEFAULT_NATIVE_LANG),
    studyLangCode: studyRaw
      ? resolveLangCode(studyRaw, DEFAULT_STUDY_LANG)
      : (stored?.studyLangCode ?? DEFAULT_STUDY_LANG),
  }
}

/** Example QR URL for local dev. */
export function buildDevLinkUrl(base = 'http://localhost:5173/'): string {
  const url = new URL(base)
  url.searchParams.set('nativeLangCode', DEFAULT_NATIVE_LANG)
  url.searchParams.set('studyLangCode', DEFAULT_STUDY_LANG)
  url.searchParams.set('authCode', 'tach')
  return url.toString()
}
