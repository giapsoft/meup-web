import type { TranslationKey } from '../i18n/types'
import { App } from '../app/App'

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
  const min = App.get().itemMinCount()
  const max = App.get().itemMaxCount()
  const n = parseWordCountInput(text)
  if (n === null) {
    return { ok: false, message: t('createAiTitle.validation.wordCountRequired') }
  }
  if (n < min) {
    return {
      ok: false,
      message: t('createAiTitle.validation.wordCountMin', { min }),
    }
  }
  if (n > max) {
    return {
      ok: false,
      message: t('createAiTitle.validation.wordCountMax', { max }),
    }
  }
  return { ok: true, value: n }
}
