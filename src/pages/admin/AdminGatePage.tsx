import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { verifyAdminSecret } from '../../api/admin'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import { loadAdminSecret, saveAdminSecret } from '../../utils/adminSecretStorage'

const ERROR_KEYS: Record<string, TranslationKey> = {
  unauthorized: 'admin.gate.error.unauthorized',
  admin_unconfigured: 'admin.gate.error.unconfigured',
  network_error: 'admin.gate.error.network',
}

function gateErrorMessage(t: (key: TranslationKey) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = ERROR_KEYS[err.code]
    if (key) {
      return t(key)
    }
  }
  return t('admin.gate.error.generic')
}

export function AdminGatePage() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stored = loadAdminSecret()
  if (stored) {
    return <Navigate to="/admin/panel/balances" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = secret.trim()
    if (!trimmed || busy) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await verifyAdminSecret(trimmed)
      saveAdminSecret(trimmed)
      navigate('/admin/panel/balances', { replace: true })
    } catch (err) {
      setError(gateErrorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
          <h1 className="mt-2 text-xl font-semibold text-text">{t('admin.gate.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('admin.gate.subtitle')}</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <label htmlFor="admin-secret" className="block">
            <span className="mb-1.5 block text-sm font-medium text-text">{t('admin.gate.secretLabel')}</span>
            <input
              id="admin-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              required
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-warning">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !secret.trim()}
            className="w-full rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('admin.gate.submitting') : t('admin.gate.submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
