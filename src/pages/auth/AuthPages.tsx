import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { loginEmail, registerEmail } from '../../api/emailAuth'
import { useReauthorize } from '../../context/DeviceSessionProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'

/** Mã lỗi từ API có thông điệp i18n riêng; còn lại dùng thông điệp chung. */
const KNOWN_ERROR_CODES = new Set([
  'invalid_credentials',
  'email_taken',
  'invalid_email',
  'weak_password',
  'too_many_requests',
])

function errorKey(err: unknown): TranslationKey {
  if (err instanceof ApiError) {
    if (err.code === 'network_error') {
      return 'auth.error.network'
    }
    if (KNOWN_ERROR_CODES.has(err.code)) {
      return `auth.error.${err.code}` as TranslationKey
    }
  }
  return 'auth.error.generic'
}

type AuthShellProps = {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-2xl font-bold text-accent"
            aria-hidden
          >
            M
          </span>
          <h1 className="text-xl font-semibold text-text">{title}</h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        {children}
        <p className="mt-6 text-center text-sm text-text-muted">{footer}</p>
      </div>
    </main>
  )
}

type FieldProps = {
  id: string
  label: string
  type: string
  value: string
  placeholder: string
  autoComplete: string
  onChange: (value: string) => void
}

function Field({ id, label, type, value, placeholder, autoComplete, onChange }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-text">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </label>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500"
    >
      {message}
    </p>
  )
}

function SubmitButton({ label, busy }: { label: string; busy: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  )
}

function LoginPage() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const reauthorize = useReauthorize()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<TranslationKey | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await loginEmail(email.trim(), password)
      navigate('/', { replace: true })
      reauthorize()
    } catch (err) {
      setError(errorKey(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-accent hover:underline">
            {t('auth.login.toRegister')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ErrorBanner message={t(error)} />}
        <Field
          id="login-email"
          label={t('auth.field.emailLabel')}
          type="email"
          value={email}
          placeholder={t('auth.field.emailPlaceholder')}
          autoComplete="email"
          onChange={setEmail}
        />
        <Field
          id="login-password"
          label={t('auth.field.passwordLabel')}
          type="password"
          value={password}
          placeholder={t('auth.field.passwordPlaceholder')}
          autoComplete="current-password"
          onChange={setPassword}
        />
        <SubmitButton label={busy ? t('auth.login.submitting') : t('auth.login.submit')} busy={busy} />
      </form>
    </AuthShell>
  )
}

function RegisterPage() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const reauthorize = useReauthorize()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<TranslationKey | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) {
      return
    }
    if (password !== confirm) {
      setError('auth.error.passwordMismatch')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await registerEmail(email.trim(), password)
      navigate('/', { replace: true })
      reauthorize()
    } catch (err) {
      setError(errorKey(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-accent hover:underline">
            {t('auth.register.toLogin')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ErrorBanner message={t(error)} />}
        <Field
          id="register-email"
          label={t('auth.field.emailLabel')}
          type="email"
          value={email}
          placeholder={t('auth.field.emailPlaceholder')}
          autoComplete="email"
          onChange={setEmail}
        />
        <Field
          id="register-password"
          label={t('auth.field.passwordLabel')}
          type="password"
          value={password}
          placeholder={t('auth.field.passwordPlaceholder')}
          autoComplete="new-password"
          onChange={setPassword}
        />
        <Field
          id="register-confirm"
          label={t('auth.register.confirmLabel')}
          type="password"
          value={confirm}
          placeholder={t('auth.register.confirmPlaceholder')}
          autoComplete="new-password"
          onChange={setConfirm}
        />
        <SubmitButton
          label={busy ? t('auth.register.submitting') : t('auth.register.submit')}
          busy={busy}
        />
      </form>
    </AuthShell>
  )
}

/** Routes công khai khi chưa đăng nhập: /login, /register; còn lại đưa về /login. */
export function AuthPages() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
