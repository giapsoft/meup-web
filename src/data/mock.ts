import { normalizeLangCode } from '../utils/langCode'

export type Language = {
  code: string
  name: string
  nativeName: string
}

/** SoT — khớp meup `LanguagesCatalog` (mã 2 hoặc 3; gồm cmn/yue/fil, không zh). */
export const LANGUAGES: Language[] = [
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'nb', name: 'Norwegian Bokmål', nativeName: 'Norsk bokmål' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'cmn', name: 'Mandarin Chinese', nativeName: '普通话' },
  { code: 'yue', name: 'Cantonese', nativeName: '粵語' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
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
