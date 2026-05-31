export const DEFAULT_NATIVE_LANG = 'vi'
export const DEFAULT_STUDY_LANG = 'en'

/**
 * Normalize to ISO 639-1 language code (vi, ja, zh, …).
 * Accepts BCP47 tags (zh-CN, en-US) by taking the language subtag only.
 * Does not map country codes (jp, cn, vn, …).
 */
export function normalizeLangCode(code: string | null | undefined): string | null {
  if (!code) {
    return null
  }

  const lower = code.trim().toLowerCase()
  if (!lower) {
    return null
  }

  const base = lower.split('-')[0]
  return base || null
}
