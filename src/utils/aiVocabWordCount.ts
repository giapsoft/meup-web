import type { TranslationKey } from '../i18n/types'

export const AI_VOCAB_MIN_WORD_COUNT = 20
export const AI_VOCAB_MAX_WORD_COUNT = 1000

export function parseWordCountInput(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  const n = Number(trimmed)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return null
  }
  return n
}

export function validateWordCountInput(
  text: string,
  t: (key: TranslationKey, params?: { min?: number; max?: number }) => string,
): { ok: true; value: number } | { ok: false; message: string } {
  const n = parseWordCountInput(text)
  if (n === null) {
    return { ok: false, message: t('createAiTitle.validation.wordCountRequired') }
  }
  if (n < AI_VOCAB_MIN_WORD_COUNT) {
    return {
      ok: false,
      message: t('createAiTitle.validation.wordCountMin', { min: AI_VOCAB_MIN_WORD_COUNT }),
    }
  }
  if (n > AI_VOCAB_MAX_WORD_COUNT) {
    return {
      ok: false,
      message: t('createAiTitle.validation.wordCountMax', { max: AI_VOCAB_MAX_WORD_COUNT }),
    }
  }
  return { ok: true, value: n }
}
