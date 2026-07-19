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
import { clearAuthTokens, loadAuthTokens } from '../api/authTokens'
import { ensureAccessToken } from '../api/client'
import { getAccount, updateLangPrefs } from '../api/emailAuth'
import { redeemLink } from '../api/deviceLink'
import { LanguagePairProvider, useLanguagePair } from './LanguagePairProvider'
import { AccountProvider } from './AccountProvider'
import { AuthLoadingPage, NotFoundPage } from '../pages/AuthGatePages'
import { SelectStudyLangPage } from '../pages/SelectStudyLangPage'
import { AdminRoutes } from '../pages/admin/AdminRoutes'
import { AuthPages } from '../pages/auth/AuthPages'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import {
  clearDeviceSession,
  loadDeviceSession,
  saveDeviceSession,
  type DeviceSession,
} from '../utils/deviceSessionStorage'
import { App } from '../app/App'
import {
  getAuthCode,
  langPairFromDeviceLink,
  parseDeviceLinkPath,
  resolveLangPair,
} from '../utils/linkParams'
import { langPairFromAccount } from '../utils/accountLangPrefs'

type SessionStatus = 'loading' | 'authorized' | 'unauthorized'

type DeviceSessionContextValue = DeviceSession

const DeviceSessionContext = createContext<DeviceSessionContextValue | null>(null)

/** Hành động xác thực dùng được ở mọi trạng thái (trang login/register lẫn app). */
const AuthActionsContext = createContext<{ reauthorize: () => void } | null>(null)

/**
 * Cổng xác thực phiên web. Thứ tự ưu tiên (tránh tạo nhiều request):
 *  1. Đã có access token còn hạn (hoặc refresh được) → authorized, không gọi mạng thừa.
 *  2. Có mã link từ QR URL (path mới hoặc `?authCode=`) → redeem 1 lần lấy token.
 *  3. Không có gì → unauthorized.
 *
 * Path QR mới: `/[study?][native?][order][mac6]` — ép lang theo path (kể cả đã login).
 * Web chỉ cho user đổi study; native từ path/account/session/default, không có picker.
 */
export function DeviceSessionProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [langs, setLangs] = useState<DeviceSession | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  /** Mã QR đã redeem fail — tránh mount AuthPages (redirect `/login` nuốt path) và tránh spinner vô hạn. */
  const [failedAuthCode, setFailedAuthCode] = useState<string | null>(null)
  const statusRef = useRef(status)
  statusRef.current = status

  const parsedLink = useMemo(
    () => parseDeviceLinkPath(location.pathname),
    [location.pathname],
  )
  const pathRedeemCode = parsedLink?.redeemCode ?? null
  const queryAuthCode = getAuthCode(searchParams)
  const pendingAuthCode = pathRedeemCode ?? queryAuthCode
  const linkRedeemFailed =
    Boolean(pendingAuthCode) && failedAuthCode !== null && failedAuthCode === pendingAuthCode

  const reauthorize = useCallback(() => setReloadToken((n) => n + 1), [])

  const langPreview = useMemo(() => {
    if (parsedLink) {
      return langPairFromDeviceLink(parsedLink)
    }
    return resolveLangPair(searchParams, loadDeviceSession())
  }, [parsedLink, searchParams])

  useEffect(() => {
    let cancelled = false

    async function run() {
      // Đã đăng nhập và không có mã QR/link mới → không chặn UI khi đổi tab/route.
      // Bỏ qua early-return khi token đã bị xóa (logout) để chuyển sang AuthPages.
      if (statusRef.current === 'authorized' && !pendingAuthCode && loadAuthTokens()) {
        return
      }

      if (!pendingAuthCode && failedAuthCode) {
        setFailedAuthCode(null)
      }

      // Mã này vừa fail → không redeem lại cho đến khi URL/mã đổi.
      if (pendingAuthCode && failedAuthCode === pendingAuthCode) {
        setStatus('unauthorized')
        setLangs(null)
        return
      }

      setStatus('loading')
      const fromQr = parsedLink ? langPairFromDeviceLink(parsedLink) : null
      const langPair = fromQr ?? resolveLangPair(searchParams, loadDeviceSession())
      const authorized = await authorizeSession(pendingAuthCode)
      if (cancelled) {
        return
      }
      if (authorized) {
        setFailedAuthCode(null)
        let finalPair = langPair
        if (fromQr) {
          // QR path: ép lang theo path — không lấy account để ghi đè.
          finalPair = fromQr
          if (finalPair.studyLangCode) {
            void updateLangPrefs(finalPair.nativeLangCode, finalPair.studyLangCode).catch(
              () => {
                // best-effort
              },
            )
          }
        } else {
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
                  nativeLangCode: hasUrlNative
                    ? finalPair.nativeLangCode
                    : fromAccount.nativeLangCode,
                  studyLangCode: hasUrlStudy
                    ? finalPair.studyLangCode
                    : fromAccount.studyLangCode,
                }
              }
            } catch {
              // Giữ cặp ngôn ngữ từ URL / sessionStorage nếu không đọc được tài khoản.
            }
          }
        }
        saveDeviceSession(finalPair)
        if (parsedLink || location.pathname === '/login' || location.pathname === '/register') {
          navigate('/', { replace: true })
        }
        setLangs(finalPair)
        setStatus('authorized')
        void App.get().config()
      } else {
        // Chỉ xoá phiên khi thực sự không còn token — tránh race redeem OK rồi retry 401
        // làm clearAuthTokens mất session vừa tạo.
        if (!(await ensureAccessToken())) {
          clearAuthTokens()
          clearDeviceSession()
          setLangs(null)
          setStatus('unauthorized')
          if (pendingAuthCode) {
            setFailedAuthCode(pendingAuthCode)
          }
        } else {
          setFailedAuthCode(null)
          saveDeviceSession(langPair)
          if (parsedLink || location.pathname === '/login' || location.pathname === '/register') {
            navigate('/', { replace: true })
          }
          setLangs(langPair)
          setStatus('authorized')
          void App.get().config()
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    reloadToken,
    pendingAuthCode,
    parsedLink,
    navigate,
    searchParams,
    location.pathname,
    failedAuthCode,
  ])

  const actions = useMemo(() => ({ reauthorize }), [reauthorize])

  let content: ReactNode
  if (location.pathname.startsWith('/admin')) {
    content = (
      <LanguagePairProvider
        initialNativeLang={langPreview.nativeLangCode}
        initialStudyLang={langPreview.studyLangCode || 'en'}
      >
        <AdminRoutes />
      </LanguagePairProvider>
    )
  } else if (location.pathname === '/verify-email') {
    content = (
      <LanguagePairProvider
        initialNativeLang={langPreview.nativeLangCode}
        initialStudyLang={langPreview.studyLangCode || 'en'}
      >
        <VerifyEmailPage />
      </LanguagePairProvider>
    )
  } else if (linkRedeemFailed) {
    // Không mount AuthPages: `*` → /login sẽ xoá path QR trước khi user kịp đọc lỗi.
    content = <NotFoundPage locale={langPreview.nativeLangCode || 'vi'} />
  } else if (status === 'loading' || (pendingAuthCode && status !== 'authorized')) {
    // Sau logout (unauthorized) + mở QR mới: KHÔNG render AuthPages trong 1 frame —
    // nếu không, Navigate `*` → /login nuốt redeem code trước khi effect chạy.
    content = <AuthLoadingPage locale={langPreview.nativeLangCode || 'vi'} />
  } else if (status === 'unauthorized' || !langs) {
    content = (
      <LanguagePairProvider
        initialNativeLang={langPreview.nativeLangCode}
        initialStudyLang={langPreview.studyLangCode || 'en'}
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
          <RequireStudyLang
            onStudySelected={(code) =>
              setLangs((prev) => (prev ? { ...prev, studyLangCode: code } : prev))
            }
          >
            <AccountProvider>{children}</AccountProvider>
          </RequireStudyLang>
        </LanguagePairProvider>
      </DeviceSessionContext.Provider>
    )
  }

  return <AuthActionsContext.Provider value={actions}>{content}</AuthActionsContext.Provider>
}

/** Khi study trống (QR không mang study) → bắt chọn StudyLang trước khi vào app. */
function RequireStudyLang({
  children,
  onStudySelected,
}: {
  children: ReactNode
  onStudySelected: (code: string) => void
}) {
  const { studyLang, setStudyLang, t } = useLanguagePair()
  if (!studyLang.trim()) {
    return (
      <SelectStudyLangPage
        title={t('selectStudy.title')}
        hint={t('selectStudy.hint')}
        onSelect={(code) => {
          setStudyLang(code)
          onStudySelected(code)
        }}
      />
    )
  }
  return children
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
    // StrictMode / effect re-run: lần 1 có thể đã redeem OK + lưu token, lần 2 bị
    // invalid_link_code (cửa sổ đã consume). Đừng coi là thất bại nếu đã có phiên.
    const again = await ensureAccessToken()
    return Boolean(again)
  }
}

function clearSession(): void {
  clearAuthTokens()
  clearDeviceSession()
  App.onUserLogout()
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
