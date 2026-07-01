import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import {
  listProductShares,
  shareProduct,
  unshareProduct,
  type OwnedProductDto,
  type ProductShareEntryDto,
} from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

type ProductShareModalProps = {
  product: OwnedProductDto
  onClose: () => void
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_request: 'products.share.error.invalid_request',
  share_target_not_found: 'products.share.error.share_target_not_found',
  product_not_found: 'products.share.error.product_not_found',
  forbidden: 'products.share.error.forbidden',
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

function shareLabel(entry: ProductShareEntryDto): string {
  if (entry.email.trim()) {
    return entry.email
  }
  return entry.userId
}

export function ProductShareModal({ product, onClose }: ProductShareModalProps) {
  const { t, uiLocale } = useLanguagePair()
  const titleId = useId()
  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  const [shares, setShares] = useState<ProductShareEntryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [email, setEmail] = useState('')
  const [deviceOrderInput, setDeviceOrderInput] = useState('')
  const [formError, setFormError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null)

  const busy = sharing || revokingUserId !== null

  const refreshShares = useCallback(async () => {
    setLoadError('')
    const res = await listProductShares(product.productId)
    setShares(res.shares)
  }, [product.productId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await listProductShares(product.productId)
        if (!cancelled) {
          setShares(res.shares)
        }
      } catch (err) {
        if (!cancelled) {
          const code = err instanceof ApiError ? err.code : 'generic'
          const key = ERROR_KEYS[code]
          setLoadError(key ? t(key) : t('products.share.error.load'))
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
  }, [product.productId, t])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, busy])

  function mapError(err: unknown): string {
    const code = err instanceof ApiError ? err.code : 'generic'
    const key = ERROR_KEYS[code]
    return key ? t(key) : t('products.share.error.generic')
  }

  async function handleShare(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    setSubmitError('')

    const trimmedEmail = email.trim()
    const orderRaw = deviceOrderInput.trim()
    const deviceOrders: number[] = []
    if (orderRaw) {
      const order = Number.parseInt(orderRaw, 10)
      if (!Number.isFinite(order) || order <= 0) {
        setFormError(t('products.share.validation.deviceOrderInvalid'))
        return
      }
      deviceOrders.push(order)
    }

    if (!trimmedEmail && deviceOrders.length === 0) {
      setFormError(t('products.share.validation.targetRequired'))
      return
    }

    setSharing(true)
    try {
      await shareProduct({
        productId: product.productId,
        emails: trimmedEmail ? [trimmedEmail] : undefined,
        deviceOrders: deviceOrders.length > 0 ? deviceOrders : undefined,
      })
      setEmail('')
      setDeviceOrderInput('')
      await refreshShares()
    } catch (err) {
      setSubmitError(mapError(err))
    } finally {
      setSharing(false)
    }
  }

  async function handleRevoke(entry: ProductShareEntryDto) {
    setSubmitError('')
    setRevokingUserId(entry.userId)
    try {
      await unshareProduct({
        productId: product.productId,
        userIds: [entry.userId],
      })
      await refreshShares()
    } catch (err) {
      setSubmitError(mapError(err))
    } finally {
      setRevokingUserId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!busy) {
            onClose()
          }
        }}
        aria-label={t('products.share.close')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 shadow-xl sm:rounded-2xl sm:p-5"
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {t('products.share.title')}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {t('products.share.subtitle', { name: product.name })}
        </p>

        <section className="mt-5">
          <h3 className="text-sm font-medium text-text">{t('products.share.listTitle')}</h3>
          {loading ? (
            <p className="mt-2 text-sm text-text-muted">{t('products.share.loading')}</p>
          ) : loadError ? (
            <p className="mt-2 text-sm text-warning">{loadError}</p>
          ) : shares.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">{t('products.share.empty')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shares.map((entry) => (
                <li
                  key={entry.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-card px-3 py-2"
                >
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium text-text">{shareLabel(entry)}</p>
                    <p className="text-xs text-text-muted">
                      {t('products.share.sharedAt', { when: formatWhen(entry.sharedAt, locale) })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRevoke(entry)}
                    disabled={busy}
                    className="shrink-0 rounded-lg border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-warning transition hover:border-warning/40 hover:bg-warning-muted disabled:opacity-60"
                  >
                    {revokingUserId === entry.userId
                      ? t('products.share.revoking')
                      : t('products.share.revoke')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={(e) => void handleShare(e)} className="mt-6 space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-medium text-text">{t('products.share.addTitle')}</h3>
          <p className="text-xs text-text-muted">{t('products.share.addHint')}</p>

          <label className="block">
            <span className="text-sm font-medium text-text">{t('products.share.emailLabel')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              placeholder={t('products.share.emailPlaceholder')}
              className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-text disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text">{t('products.share.deviceOrderLabel')}</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={deviceOrderInput}
              onChange={(e) => setDeviceOrderInput(e.target.value)}
              disabled={busy}
              placeholder={t('products.share.deviceOrderPlaceholder')}
              className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm tabular-nums text-text disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-text-muted">{t('products.share.deviceOrderHint')}</p>
          </label>

          {formError ? <p className="text-xs text-warning">{formError}</p> : null}
          {submitError ? (
            <p className="rounded-lg border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-border bg-surface-card px-4 py-2 text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-60"
            >
              {t('products.share.close')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
            >
              {sharing ? t('products.share.sharing') : t('products.share.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
