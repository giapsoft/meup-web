import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { updateLangPrefs } from '../api/emailAuth'
import { langPairId, resolveUiLocale, translate } from '../i18n/messages'
import type { MessageParams, TranslationKey, UiLocale } from '../i18n/types'
import { patchDeviceSession } from '../utils/deviceSessionStorage'

type LanguagePairContextValue = {
  /** Read-only — không còn picker; nguồn: QR / account / session / default. */
  nativeLang: string
  studyLang: string
  uiLocale: UiLocale
  langPair: string
  setStudyLang: (code: string) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

const LanguagePairContext = createContext<LanguagePairContextValue | null>(null)

type LanguagePairProviderProps = {
  children: ReactNode
  initialNativeLang: string
  initialStudyLang: string
}

export function LanguagePairProvider({
  children,
  initialNativeLang,
  initialStudyLang,
}: LanguagePairProviderProps) {
  const [nativeLang, setNativeLangState] = useState(initialNativeLang)
  const [studyLang, setStudyLangState] = useState(initialStudyLang)

  // Dùng ref để luôn đọc giá trị mới nhất trong callback mà không tạo closure stale.
  const nativeLangRef = useRef(nativeLang)
  nativeLangRef.current = nativeLang

  useEffect(() => {
    setNativeLangState(initialNativeLang)
    setStudyLangState(initialStudyLang)
  }, [initialNativeLang, initialStudyLang])

  const uiLocale = resolveUiLocale(nativeLang)

  useEffect(() => {
    document.documentElement.lang = uiLocale
  }, [uiLocale])

  const setStudyLang = useCallback((code: string) => {
    setStudyLangState(code)
    patchDeviceSession({ studyLangCode: code })
    void updateLangPrefs(nativeLangRef.current, code).catch(() => {
      // best-effort: lỗi mạng không chặn UI
    })
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: MessageParams) => translate(uiLocale, key, params),
    [uiLocale],
  )

  const value = useMemo<LanguagePairContextValue>(
    () => ({
      nativeLang,
      studyLang,
      uiLocale,
      langPair: langPairId(nativeLang, studyLang),
      setStudyLang,
      t,
    }),
    [nativeLang, studyLang, uiLocale, setStudyLang, t],
  )

  return (
    <LanguagePairContext.Provider value={value}>{children}</LanguagePairContext.Provider>
  )
}

export function useLanguagePair(): LanguagePairContextValue {
  const ctx = useContext(LanguagePairContext)
  if (!ctx) {
    throw new Error('useLanguagePair must be used within LanguagePairProvider')
  }
  return ctx
}
