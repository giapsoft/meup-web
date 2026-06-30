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
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { clearAuthTokens } from '../api/authTokens'
import { ensureAccessToken } from '../api/client'
import { getAccount } from '../api/emailAuth'
import { redeemLink } from '../api/deviceLink'
import { LanguagePairProvider } from './LanguagePairProvider'
import { AuthLoadingPage } from '../pages/AuthGatePages'
import { AuthPages } from '../pages/auth/AuthPages'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import {
  clearDeviceSession,
  loadDeviceSession,
  saveDeviceSession,
  type DeviceSession,
} from '../utils/deviceSessionStorage'
import { getAuthCode, getPathAuthCode, resolveLangPair } from '../utils/linkParams'
import { langPairFromAccount } from '../utils/accountLangPrefs'

type SessionStatus = 'loading' | 'authorized' | 'unauthorized'

type DeviceSessionContextValue = DeviceSession

const DeviceSessionContext = createContext<DeviceSessionContextValue | null>(null)

/** Hành động xác thực dùng được ở mọi trạng thái (trang login/register lẫn app). */
const AuthActionsContext = createContext<{ reauthorize: () => void } | null>(null)

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
  const [reloadToken, setReloadToken] = useState(0)
  const statusRef = useRef(status)
  statusRef.current = status

  const pathAuthCode = getPathAuthCode(location.pathname)
  const queryAuthCode = getAuthCode(searchParams)
  const pendingAuthCode = pathAuthCode ?? queryAuthCode

  const reauthorize = useCallback(() => setReloadToken((n) => n + 1), [])

  const langPreview = useMemo(
    () => resolveLangPair(searchParams, loadDeviceSession()),
    [searchParams],
  )

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Đã đăng nhập và không có mã QR/link mới → không chặn UI khi đổi tab/route.
      if (statusRef.current === 'authorized' && !pendingAuthCode) {
        return
      }

      setStatus('loading')
      const langPair = resolveLangPair(searchParams, loadDeviceSession())
      const authorized = await authorizeSession(pendingAuthCode)
      if (cancelled) {
        return
      }
      if (authorized) {
        let finalPair = langPair
        const hasUrlNative = searchParams.has('nativeLangCode')
        const hasUrlStudy = searchParams.has('studyLangCode')
        const stored = loadDeviceSession()
        const hasStoredLangs = Boolean(stored?.nativeLangCode && stored?.studyLangCode)
        if ((!hasUrlNative || !hasUrlStudy) && !hasStoredLangs) {
          try {
            const account = await getAccount()
            const fromAccount = langPairFromAccount(account)
            if (fromAccount) {
              finalPair = {
                nativeLangCode: hasUrlNative ? finalPair.nativeLangCode : fromAccount.nativeLangCode,
                studyLangCode: hasUrlStudy ? finalPair.studyLangCode : fromAccount.studyLangCode,
              }
            }
          } catch {
            // Giữ cặp ngôn ngữ từ URL / sessionStorage nếu không đọc được tài khoản.
          }
        }
        saveDeviceSession(finalPair)
        // Dọn mã khỏi URL (dùng-một-lần) và đưa về trang chủ.
        if (pathAuthCode) {
          navigate('/', { replace: true })
        }
        setLangs(finalPair)
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
  }, [reloadToken, pendingAuthCode, pathAuthCode, navigate, searchParams])

  const actions = useMemo(() => ({ reauthorize }), [reauthorize])

  let content: ReactNode
  if (location.pathname === '/verify-email') {
    // Trang xác thực email chỉ cần token trong URL (không phụ thuộc phiên) → bỏ qua cổng auth.
    content = (
      <LanguagePairProvider
        initialNativeLang={langPreview.nativeLangCode}
        initialStudyLang={langPreview.studyLangCode}
      >
        <VerifyEmailPage />
      </LanguagePairProvider>
    )
  } else if (status === 'loading') {
    content = <AuthLoadingPage locale={langPreview.nativeLangCode} />
  } else if (status === 'unauthorized' || !langs) {
    // Chưa có phiên → cho đăng nhập/đăng ký bằng email (vẫn bọc LanguagePairProvider để dịch
    // UI theo ngôn ngữ suy ra từ URL/lưu trữ).
    content = (
      <LanguagePairProvider
        initialNativeLang={langPreview.nativeLangCode}
        initialStudyLang={langPreview.studyLangCode}
      >
        <AuthPages />
      </LanguagePairProvider>
    )
  } else {
    content = (
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

  return <AuthActionsContext.Provider value={actions}>{content}</AuthActionsContext.Provider>
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

/** Buộc cổng xác thực chạy lại (sau khi đăng nhập/đăng ký/đăng xuất). */
export function useReauthorize(): () => void {
  const ctx = useContext(AuthActionsContext)
  if (!ctx) {
    throw new Error('useReauthorize must be used within DeviceSessionProvider')
  }
  return ctx.reauthorize
}
