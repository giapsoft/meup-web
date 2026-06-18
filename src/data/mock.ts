import { normalizeLangCode } from '../utils/langCode'

export type Language = {
  code: string
  name: string
  nativeName: string
}

export const LANGUAGES: Language[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
]

/** Mock device session — replace with API later. */
export const MOCK_DEVICE = {
  name: 'MeUp #A1B2',
  creditsRemaining: 128,
}

export function findLanguage(code: string): Language | undefined {
  const normalized = normalizeLangCode(code) ?? code
  return LANGUAGES.find((l) => l.code === normalized)
}

export function formatLanguageOption(lang: Language): string {
  return `${lang.code} — ${lang.nativeName}`
}
