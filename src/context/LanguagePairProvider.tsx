import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { langPairId, resolveUiLocale, translate } from '../i18n/messages'
import type { MessageParams, TranslationKey, UiLocale } from '../i18n/types'
import { patchDeviceSession } from '../utils/deviceSessionStorage'

type LanguagePairContextValue = {
  nativeLang: string
  studyLang: string
  uiLocale: UiLocale
  langPair: string
  setNativeLang: (code: string) => void
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

  useEffect(() => {
    setNativeLangState(initialNativeLang)
    setStudyLangState(initialStudyLang)
  }, [initialNativeLang, initialStudyLang])

  const uiLocale = resolveUiLocale(nativeLang)

  useEffect(() => {
    document.documentElement.lang = uiLocale
  }, [uiLocale])

  const setNativeLang = useCallback((code: string) => {
    setNativeLangState(code)
    patchDeviceSession({ nativeLangCode: code })
  }, [])

  const setStudyLang = useCallback((code: string) => {
    setStudyLangState(code)
    patchDeviceSession({ studyLangCode: code })
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
      setNativeLang,
      setStudyLang,
      t,
    }),
    [nativeLang, studyLang, uiLocale, setNativeLang, setStudyLang, t],
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
