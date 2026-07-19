import { normalizeLangCode } from '../utils/langCode'

export type Language = {
  code: string
  /** Tên hiển thị SoT — khớp meup `LanguagesCatalog` (bản tiếng Việt). */
  name: string
  /** Alias `name` — giữ field cho chỗ đang đọc `nativeName`. */
  nativeName: string
}

function lang(code: string, name: string): Language {
  const display = name.startsWith('Tiếng ') ? name : `Tiếng ${name}`
  return { code, name: display, nativeName: display }
}

/** SoT — khớp meup `LanguagesCatalog.h` (mã 2 hoặc 3; gồm cmn/yue/fil, không zh). */
export const LANGUAGES: Language[] = [
  lang('af', 'Afrikaans'),
  lang('en', 'Anh'),
  lang('ar', 'Ả Rập'),
  lang('pl', 'Ba Lan'),
  lang('eu', 'Basque'),
  lang('bn', 'Bengal'),
  lang('pt', 'Bồ Đào Nha'),
  lang('bg', 'Bulgaria'),
  lang('ca', 'Catalan'),
  lang('hr', 'Croatia'),
  lang('da', 'Đan Mạch'),
  lang('he', 'Do Thái'),
  lang('de', 'Đức'),
  lang('et', 'Estonia'),
  lang('fil', 'Filipino'),
  lang('gl', 'Galicia'),
  lang('gu', 'Gujarati'),
  lang('nl', 'Hà Lan'),
  lang('ko', 'Hàn'),
  lang('hi', 'Hindi'),
  lang('hu', 'Hungary'),
  lang('el', 'Hy Lạp'),
  lang('is', 'Iceland'),
  lang('id', 'Indonesia'),
  lang('kn', 'Kannada'),
  lang('lv', 'Latvia'),
  lang('lt', 'Litva'),
  lang('ms', 'Malay'),
  lang('ml', 'Malayalam'),
  lang('mr', 'Marathi'),
  lang('nb', 'Na Uy Bokmal'),
  lang('ru', 'Nga'),
  lang('ja', 'Nhật'),
  lang('fi', 'Phần Lan'),
  lang('fr', 'Pháp'),
  lang('pa', 'Punjabi'),
  lang('cmn', 'Quan thoại'),
  lang('yue', 'Quảng Đông'),
  lang('ro', 'Romania'),
  lang('cs', 'Séc'),
  lang('sr', 'Serbia'),
  lang('sk', 'Slovak'),
  lang('sl', 'Slovenia'),
  lang('ta', 'Tamil'),
  lang('es', 'Tây Ban Nha'),
  lang('te', 'Telugu'),
  lang('th', 'Thái'),
  lang('tr', 'Thổ Nhĩ Kỳ'),
  lang('sv', 'Thụy Điển'),
  lang('uk', 'Ukraina'),
  lang('ur', 'Urdu'),
  lang('vi', 'Việt'),
  lang('it', 'Ý'),
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

export function formatLanguageOption(lang: Language, index?: number): string {
  const label = `${lang.code} — ${lang.name}`
  return index != null ? `${index}. ${label}` : label
}
