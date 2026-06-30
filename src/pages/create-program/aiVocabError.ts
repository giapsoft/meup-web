import type { TranslationKey } from '../../i18n/types'

const AI_VOCAB_ERROR_KEYS: Partial<Record<string, TranslationKey>> = {
  insufficient_credits: 'createAiTitle.error.insufficient_credits',
  invalid_request: 'createAiTitle.error.invalid_request',
  invalid_job: 'createAiTitle.error.invalid_job',
  owner_not_found: 'createAiTitle.error.owner_not_found',
}

export function aiVocabErrorMessage(code: string, t: (key: TranslationKey) => string): string {
  const key = AI_VOCAB_ERROR_KEYS[code]
  return key ? t(key) : code
}
