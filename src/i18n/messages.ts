import de from '../locales/de.json'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import ja from '../locales/ja.json'
import ko from '../locales/ko.json'
import vi from '../locales/vi.json'
import zh from '../locales/zh.json'
import type { MessageParams, Messages, TranslationKey, UiLocale } from './types'

export const UI_LOCALES: UiLocale[] = ['vi', 'en', 'ja', 'ko', 'zh', 'fr', 'de']

const LOCALE_MESSAGES: Record<UiLocale, Messages> = {
  vi: vi as Messages,
  en: en as Messages,
  ja: ja as Messages,
  ko: ko as Messages,
  zh: zh as Messages,
  fr: fr as Messages,
  de: de as Messages,
}

const FALLBACK_LOCALE: UiLocale = 'en'

export function isUiLocale(code: string): code is UiLocale {
  return (UI_LOCALES as string[]).includes(code)
}

export function resolveUiLocale(code: string | undefined): UiLocale {
  if (code && isUiLocale(code)) {
    return code
  }
  return FALLBACK_LOCALE
}

export function detectBrowserLocale(): UiLocale {
  const raw = navigator.language?.split('-')[0]?.toLowerCase()
  return resolveUiLocale(raw)
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key]
    return value === undefined ? `{${key}}` : String(value)
  })
}

export function translate(
  locale: UiLocale,
  key: TranslationKey,
  params?: MessageParams,
): string {
  const primary = LOCALE_MESSAGES[locale]?.[key]
  if (primary) {
    return interpolate(primary, params)
  }

  const fallback = LOCALE_MESSAGES[FALLBACK_LOCALE][key]
  if (fallback) {
    return interpolate(fallback, params)
  }

  return key
}

export function langPairId(nativeLang: string, studyLang: string): string {
  return `${nativeLang}_${studyLang}`
}
