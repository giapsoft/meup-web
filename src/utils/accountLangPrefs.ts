import type { AccountDto } from '../api/emailAuth'
import { isKnownLangCode, resolveLangCode, type LangPair } from './linkParams'

/** Chỉ cần mã ngôn ngữ từ account (login/me/PATCH). */
export type AccountLangPrefs = Pick<AccountDto, 'nativeLangCode' | 'studyLangCode'>

/** Account lang prefs when both codes are set and known in the language picker. */
export function langPairFromAccount(account: AccountLangPrefs): LangPair | null {
  const nativeRaw = account.nativeLangCode?.trim()
  const studyRaw = account.studyLangCode?.trim()
  if (!nativeRaw || !studyRaw) {
    return null
  }

  const nativeLangCode = resolveLangCode(nativeRaw, '')
  const studyLangCode = resolveLangCode(studyRaw, '')
  if (!nativeLangCode || !studyLangCode) {
    return null
  }
  if (!isKnownLangCode(nativeLangCode) || !isKnownLangCode(studyLangCode)) {
    return null
  }

  return { nativeLangCode, studyLangCode }
}
