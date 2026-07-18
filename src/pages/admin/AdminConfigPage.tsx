import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  listAdminSystemConfig,
  updateAdminSystemConfig,
  type AdminSystemConfigEntry,
} from '../../api/admin'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

function isMultilineKind(kind: AdminSystemConfigEntry['kind']): boolean {
  return kind === 'json' || kind === 'compact'
}

function textareaRows(value: string, kind: AdminSystemConfigEntry['kind']): number {
  if (kind === 'compact') {
    return Math.min(16, Math.max(6, value.split('\n').length))
  }
  if (kind === 'json') {
    return Math.min(20, Math.max(8, value.split('\n').length))
  }
  return 4
}

export function AdminConfigPage() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [entries, setEntries] = useState<AdminSystemConfigEntry[]>([])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!secret) {
      return
    }
    setLoadState({ phase: 'loading' })
    try {
      const next = await listAdminSystemConfig(secret)
      setEntries(next)
      setDraft(Object.fromEntries(next.map((entry) => [entry.key, entry.value])))
      setLoadState({ phase: 'ready' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      const message =
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [secret, navigate, t])

  useEffect(() => {
    void load()
  }, [load])

  const dirtyKeys = useMemo(() => {
    return entries
      .filter((entry) => (draft[entry.key] ?? '') !== entry.value)
      .map((entry) => entry.key)
  }, [entries, draft])

  const handleExit = useCallback(() => {
    clearAdminSecret()
    navigate('/admin', { replace: true })
  }, [navigate])

  const handleSave = useCallback(async () => {
    if (saveBusy || !secret || dirtyKeys.length === 0) {
      return
    }
    setSaveBusy(true)
    setSaveMessage(null)
    try {
      const updated = await updateAdminSystemConfig(
        secret,
        dirtyKeys.map((key) => ({ key, value: draft[key] ?? '' })),
      )
      setEntries(updated)
      setDraft(Object.fromEntries(updated.map((entry) => [entry.key, entry.value])))
      setSaveMessage(t('admin.config.saveSuccess', { count: dirtyKeys.length }))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setSaveMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setSaveBusy(false)
    }
  }, [saveBusy, secret, dirtyKeys, draft, t, navigate])

  if (!secret) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
            <h1 className="text-lg font-semibold text-text">{t('admin.config.title')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/panel"
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-muted no-underline transition hover:border-accent/40 hover:text-text"
            >
              {t('admin.config.backPanel')}
            </Link>
            <button
              type="button"
              onClick={handleExit}
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-muted transition hover:border-warning/40 hover:text-text"
            >
              {t('admin.panel.exit')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm leading-relaxed text-text-muted">{t('admin.config.hint')}</p>

        {loadState.phase === 'loading' && (
          <p className="mt-4 text-sm text-text-muted">{t('admin.loading')}</p>
        )}
        {loadState.phase === 'error' && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
            <p>{loadState.message}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-2 text-sm font-medium underline"
            >
              {t('admin.retryLoad')}
            </button>
          </div>
        )}

        {loadState.phase === 'ready' && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {dirtyKeys.length > 0
                  ? t('admin.config.dirtyCount', { count: dirtyKeys.length })
                  : t('admin.config.noChanges')}
              </p>
              <button
                type="button"
                disabled={saveBusy || dirtyKeys.length === 0}
                onClick={() => void handleSave()}
                className="rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveBusy ? t('admin.config.saving') : t('admin.config.save')}
              </button>
            </div>
            {saveMessage && (
              <p className="mt-3 text-sm text-text-muted" role="status">
                {saveMessage}
              </p>
            )}

            <div className="mt-4 space-y-4">
              {entries.map((entry) => {
                const value = draft[entry.key] ?? ''
                const dirty = value !== entry.value
                const multiline = isMultilineKind(entry.kind)
                return (
                  <article
                    key={entry.key}
                    className={[
                      'rounded-xl border bg-surface-card p-4',
                      dirty ? 'border-accent/50' : 'border-border',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium text-text">{entry.key}</p>
                        <p className="mt-1 text-xs text-text-muted">{entry.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 font-medium text-text-muted">
                          {entry.kind}
                        </span>
                        {!entry.inDatabase && (
                          <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-text-muted">
                            {t('admin.config.usingDefault')}
                          </span>
                        )}
                        {dirty && (
                          <span className="rounded-md border border-accent/40 bg-accent-soft px-2 py-0.5 text-accent">
                            {t('admin.config.modified')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {entry.kind === 'bool' ? (
                        <select
                          value={value}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : entry.kind === 'int' ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                        />
                      ) : multiline ? (
                        <textarea
                          value={value}
                          rows={textareaRows(value, entry.kind)}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          spellCheck={false}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed text-text"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                        />
                      )}
                    </div>

                    {entry.defaultValue && entry.defaultValue !== value && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, [entry.key]: entry.defaultValue }))
                        }
                        className="mt-2 text-xs text-accent hover:underline"
                      >
                        {t('admin.config.resetDefault')}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
