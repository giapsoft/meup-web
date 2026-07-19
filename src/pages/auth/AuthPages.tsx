import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { parseDeviceLinkPath } from '../../utils/linkParams'

/** Decorative QR-frame mark — not a real code. */
function QrMark({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="8" y="8" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="5" />
      <rect x="18" y="18" width="20" height="20" rx="3" fill="currentColor" />
      <rect x="72" y="8" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="5" />
      <rect x="82" y="18" width="20" height="20" rx="3" fill="currentColor" />
      <rect x="8" y="72" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="5" />
      <rect x="18" y="82" width="20" height="20" rx="3" fill="currentColor" />
      <rect x="72" y="72" width="14" height="14" rx="2" fill="currentColor" />
      <rect x="92" y="72" width="14" height="14" rx="2" fill="currentColor" />
      <rect x="72" y="92" width="14" height="14" rx="2" fill="currentColor" />
      <rect x="98" y="98" width="14" height="14" rx="2" fill="currentColor" />
      <path
        d="M56 28h8v8h-8V28Zm0 16h8v8h-8V44Zm16 16h8v8h-8V60Zm-16 0h8v8h-8V60Z"
        fill="currentColor"
        opacity="0.45"
      />
    </svg>
  )
}

/** Trang hướng dẫn khi chưa có phiên QR — không form, không nút. */
function DeviceLinkGuidePage() {
  const { t } = useLanguagePair()

  return (
    <main className="auth-guide relative flex min-h-svh flex-col overflow-hidden">
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="auth-guide-grid absolute inset-0 opacity-[0.35]" />
        <div className="auth-guide-orb auth-guide-orb-a absolute -left-24 top-[-10%] h-[42vmax] w-[42vmax] rounded-full bg-accent/25 blur-3xl" />
        <div className="auth-guide-orb auth-guide-orb-b absolute -right-16 bottom-[-5%] h-[36vmax] w-[36vmax] rounded-full bg-accent-muted/20 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface/40 to-surface" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
        <p className="auth-guide-rise auth-guide-rise-1 text-3xl font-semibold tracking-tight text-accent sm:text-4xl">
          MeUp
        </p>

        <div className="auth-guide-rise auth-guide-rise-2 mt-10 text-accent">
          <div className="auth-guide-breathe mx-auto flex h-28 w-28 items-center justify-center rounded-[1.75rem] border border-accent/25 bg-accent-soft sm:h-32 sm:w-32">
            <QrMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
          </div>
        </div>

        <h1 className="auth-guide-rise auth-guide-rise-3 mt-10 text-balance text-xl font-semibold leading-snug text-text sm:text-2xl">
          {t('auth.guide.headline')}
        </h1>

        <p className="auth-guide-rise auth-guide-rise-4 mt-4 max-w-md text-pretty text-sm leading-relaxed text-text-muted sm:text-base">
          {t('auth.guide.subtitle')}
        </p>
      </div>
    </main>
  )
}

/** Redirect mọi path lạ về /login, trừ path QR device-link (để gate còn redeem được). */
function RedirectUnknownToLogin() {
  const location = useLocation()
  if (parseDeviceLinkPath(location.pathname)) {
    return null
  }
  return <Navigate to="/login" replace />
}

/** Routes công khai khi chưa có phiên: hướng dẫn QR; /register → cùng trang. */
export function AuthPages() {
  return (
    <Routes>
      <Route path="/login" element={<DeviceLinkGuidePage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<RedirectUnknownToLogin />} />
    </Routes>
  )
}
