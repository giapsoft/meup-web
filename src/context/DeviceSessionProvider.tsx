import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { clearAuthTokens } from '../api/authTokens'
import { ensureAccessToken } from '../api/client'
import { redeemLink } from '../api/deviceLink'
import { LanguagePairProvider } from './LanguagePairProvider'
import { AuthLoadingPage, NotFoundPage } from '../pages/AuthGatePages'
import {
  clearDeviceSession,
  loadDeviceSession,
  saveDeviceSession,
  type DeviceSession,
} from '../utils/deviceSessionStorage'
import { getAuthCode, getPathAuthCode, resolveLangPair } from '../utils/linkParams'

type SessionStatus = 'loading' | 'authorized' | 'unauthorized'

type DeviceSessionContextValue = DeviceSession

const DeviceSessionContext = createContext<DeviceSessionContextValue | null>(null)

/**
 * Cổng xác thực phiên web. Thứ tự ưu tiên (tránh tạo nhiều request):
 *  1. Đã có access token còn hạn (hoặc refresh được) → authorized, không gọi mạng thừa.
 *  2. Có mã link từ QR URL (path `/<order>-<mac>` hoặc `?authCode=`) → redeem 1 lần lấy token.
 *  3. Không có gì → unauthorized.
 */
export function DeviceSessionProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [langs, setLangs] = useState<DeviceSession | null>(null)

  const langPreview = useMemo(
    () => resolveLangPair(searchParams, loadDeviceSession()),
    [searchParams],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      setStatus('loading')
      const langPair = resolveLangPair(searchParams, loadDeviceSession())
      const pathCode = getPathAuthCode(location.pathname)
      const authorized = await authorizeSession(pathCode ?? getAuthCode(searchParams))
      if (cancelled) {
        return
      }
      if (authorized) {
        saveDeviceSession(langPair)
        // Dọn mã khỏi URL (dùng-một-lần) và đưa về trang chủ.
        if (pathCode) {
          navigate('/', { replace: true })
        }
        setLangs(langPair)
        setStatus('authorized')
      } else {
        clearAuthTokens()
        clearDeviceSession()
        setLangs(null)
        setStatus('unauthorized')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [searchParams, location.pathname, navigate])

  if (status === 'loading') {
    return <AuthLoadingPage locale={langPreview.nativeLangCode} />
  }

  if (status === 'unauthorized' || !langs) {
    return <NotFoundPage locale={langPreview.nativeLangCode} />
  }

  return (
    <DeviceSessionContext.Provider value={langs}>
      <LanguagePairProvider
        initialNativeLang={langs.nativeLangCode}
        initialStudyLang={langs.studyLangCode}
      >
        {children}
      </LanguagePairProvider>
    </DeviceSessionContext.Provider>
  )
}

async function authorizeSession(authCode: string | null): Promise<boolean> {
  const token = await ensureAccessToken()
  if (token) {
    return true
  }
  if (!authCode) {
    return false
  }
  try {
    await redeemLink(authCode)
    return true
  } catch {
    return false
  }
}

function clearSession(): void {
  clearAuthTokens()
  clearDeviceSession()
}

export function useDeviceSession(): DeviceSessionContextValue {
  const ctx = useContext(DeviceSessionContext)
  if (!ctx) {
    throw new Error('useDeviceSession must be used within an authorized DeviceSessionProvider')
  }
  return ctx
}

/** Call on logout — clears persisted tokens + device session. */
export function useClearDeviceSession(): () => void {
  return clearSession
}
