import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import { verifyDeviceLink } from '../api/verifyDeviceLink'
import { LanguagePairProvider } from './LanguagePairProvider'
import { AuthLoadingPage, NotFoundPage } from '../pages/AuthGatePages'
import {
  clearDeviceSession,
  loadDeviceSession,
  saveDeviceSession,
  type DeviceSession,
} from '../utils/deviceSessionStorage'
import { mergeEntrySession } from '../utils/linkParams'

type SessionStatus = 'loading' | 'authorized' | 'unauthorized'

type DeviceSessionContextValue = DeviceSession

const DeviceSessionContext = createContext<DeviceSessionContextValue | null>(null)

export function DeviceSessionProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [session, setSession] = useState<DeviceSession | null>(null)

  const entryPreview = useMemo(
    () => mergeEntrySession(searchParams, loadDeviceSession()),
    [searchParams],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      const stored = loadDeviceSession()
      const entry = mergeEntrySession(searchParams, stored)

      if (!entry) {
        setSession(null)
        setStatus('unauthorized')
        return
      }

      const sameAsStored =
        stored?.authCode === entry.authCode &&
        stored.nativeLangCode === entry.nativeLangCode &&
        stored.studyLangCode === entry.studyLangCode

      if (sameAsStored) {
        setSession(stored)
        setStatus('authorized')
        return
      }

      setStatus('loading')
      const result = await verifyDeviceLink(entry.authCode)
      if (cancelled) {
        return
      }

      if (result.ok) {
        saveDeviceSession(entry)
        setSession(entry)
        setStatus('authorized')
      } else {
        clearDeviceSession()
        setSession(null)
        setStatus('unauthorized')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  if (status === 'loading') {
    const locale = entryPreview?.nativeLangCode ?? 'vi'
    return <AuthLoadingPage locale={locale} />
  }

  if (status === 'unauthorized' || !session) {
    const locale = entryPreview?.nativeLangCode ?? 'vi'
    return <NotFoundPage locale={locale} />
  }

  return (
    <DeviceSessionContext.Provider value={session}>
      <LanguagePairProvider
        initialNativeLang={session.nativeLangCode}
        initialStudyLang={session.studyLangCode}
      >
        {children}
      </LanguagePairProvider>
    </DeviceSessionContext.Provider>
  )
}

export function useDeviceSession(): DeviceSessionContextValue {
  const ctx = useContext(DeviceSessionContext)
  if (!ctx) {
    throw new Error('useDeviceSession must be used within an authorized DeviceSessionProvider')
  }
  return ctx
}

/** Call on logout — clears persisted device session. */
export function useClearDeviceSession(): () => void {
  return clearDeviceSession
}
