import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  acceptInvitation,
  declineInvitation,
  listInvitations,
  type InvitationDto,
} from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_request: 'invitations.error.invalid_request',
  invite_not_found: 'invitations.error.invite_not_found',
  invite_not_pending: 'invitations.error.invite_not_pending',
  already_has_access: 'invitations.error.already_has_access',
  forbidden: 'invitations.error.forbidden',
}

function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function InvitationsPage() {
  const { t, uiLocale } = useLanguagePair()
  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  const [items, setItems] = useState<InvitationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoadError('')
    const res = await listInvitations('pending')
    setItems(res.invitations)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await listInvitations('pending')
        if (!cancelled) {
          setItems(res.invitations)
        }
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof ApiError ? err.code : 'generic'
          const key = ERROR_KEYS[code]
          setLoadError(key ? t(key) : t('invitations.error.load'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [t])

  function mapError(err: unknown): string {
    const code = err instanceof ApiError ? err.code : 'generic'
    const key = ERROR_KEYS[code]
    return key ? t(key) : t('invitations.error.generic')
  }

  async function handleAccept(id: string) {
    setActionError('')
    setBusyId(id)
    try {
      await acceptInvitation(id)
      await refresh()
    } catch (err) {
      setActionError(mapError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(id: string) {
    setActionError('')
    setBusyId(id)
    try {
      await declineInvitation(id)
      await refresh()
    } catch (err) {
      setActionError(mapError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-text">{t('invitations.title')}</h1>
      <p className="mt-1 text-sm text-text-muted">{t('invitations.subtitle')}</p>

      {actionError ? (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">{t('invitations.loading')}</p>
      ) : loadError ? (
        <p className="mt-8 text-sm text-warning">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">{t('invitations.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const busy = busyId === item.id
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-surface-raised px-4 py-4 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold text-text">{item.product.name}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('invitations.meta', {
                      deviceOrder: item.deviceOrder,
                      when: formatWhen(item.createdAt, locale),
                      vocabCount: item.product.vocabCount,
                    })}
                  </p>
                  {item.note?.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-text">{item.note.trim()}</p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void handleAccept(item.id)}
                    className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
                  >
                    {busy ? t('invitations.accepting') : t('invitations.accept')}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void handleDecline(item.id)}
                    className="rounded-lg border border-border bg-surface-card px-4 py-2 text-sm font-medium text-warning transition hover:border-warning/40 hover:bg-warning-muted disabled:opacity-60"
                  >
                    {busy ? t('invitations.declining') : t('invitations.decline')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
