import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  createCheckout,
  fakeTopup,
  getCheckout,
  type CheckoutSessionDto,
  type CreditPackageDto,
} from '../api/credits'
import { ApiError } from '../api/client'
import { useAccount } from '../context/AccountProvider'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

const POLL_MS = 2500

type PaymentCheckoutDialogProps = {
  package: CreditPackageDto
  onClose: () => void
}

function formatVnd(amount: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(amount)
  } catch {
    return String(amount)
  }
}

function mapCheckoutError(err: unknown): TranslationKey {
  const code = err instanceof ApiError ? err.code : ''
  if (code === 'payment_bank_unconfigured') return 'credits.dialog.errorBank'
  if (code === 'fake_payment_disabled') return 'credits.dialog.errorFake'
  return 'credits.dialog.error'
}

export function PaymentCheckoutDialog({ package: pkg, onClose }: PaymentCheckoutDialogProps) {
  const { t, uiLocale } = useLanguagePair()
  const { setCreditBalance, refreshAccount } = useAccount()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const pollAbortRef = useRef(false)

  const [session, setSession] = useState<CheckoutSessionDto | null>(null)
  const [phase, setPhase] = useState<'loading' | 'pay' | 'success' | 'error'>('loading')
  const [errorKey, setErrorKey] = useState<TranslationKey>('credits.dialog.error')
  const [fakeBusy, setFakeBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const stopPoll = useCallback(() => {
    pollAbortRef.current = true
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKeyDown)
      stopPoll()
    }
  }, [onClose, stopPoll])

  useEffect(() => {
    let cancelled = false
    pollAbortRef.current = false

    async function start() {
      setPhase('loading')
      try {
        let created: CheckoutSessionDto
        try {
          created = await createCheckout({ packageId: pkg.id })
        } catch (err) {
          // Local/dev: bank env missing → fall back to fake instructor when allowed.
          if (err instanceof ApiError && err.code === 'payment_bank_unconfigured') {
            created = await createCheckout({ packageId: pkg.id, provider: 'fake' })
          } else {
            throw err
          }
        }
        if (cancelled) {
          return
        }
        setSession(created)
        if (created.status === 'completed') {
          setPhase('success')
          void refreshAccount()
          return
        }
        setPhase('pay')
      } catch (err) {
        if (cancelled) {
          return
        }
        setErrorKey(mapCheckoutError(err))
        setPhase('error')
      }
    }

    void start()
    return () => {
      cancelled = true
    }
  }, [pkg.id, refreshAccount])

  useEffect(() => {
    if (phase !== 'pay' || !session?.checkoutId) {
      return
    }
    pollAbortRef.current = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      if (pollAbortRef.current || !session) {
        return
      }
      if (Date.parse(session.expiresAt) <= Date.now()) {
        setErrorKey('credits.dialog.expired')
        setPhase('error')
        return
      }
      try {
        const status = await getCheckout(session.checkoutId)
        if (pollAbortRef.current) {
          return
        }
        if (status.status === 'completed') {
          setCreditBalance(status.creditBalance)
          setPhase('success')
          void refreshAccount()
          return
        }
        if (
          status.status === 'expired' ||
          status.status === 'cancelled' ||
          Date.parse(status.expiresAt) <= Date.now()
        ) {
          setErrorKey('credits.dialog.expired')
          setPhase('error')
          return
        }
      } catch {
        // keep polling on transient errors
      }
      if (!pollAbortRef.current) {
        timer = setTimeout(() => {
          void poll()
        }, POLL_MS)
      }
    }

    timer = setTimeout(() => {
      void poll()
    }, POLL_MS)

    return () => {
      pollAbortRef.current = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [phase, session, setCreditBalance, refreshAccount])

  async function handleFakeTopup() {
    if (!session || fakeBusy) {
      return
    }
    setFakeBusy(true)
    try {
      await fakeTopup({ checkoutId: session.checkoutId })
      const status = await getCheckout(session.checkoutId)
      setCreditBalance(status.creditBalance)
      setPhase('success')
      void refreshAccount()
    } catch {
      setErrorKey('credits.dialog.error')
      setPhase('error')
    } finally {
      setFakeBusy(false)
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const instructions = session?.instructions
  const isQr = instructions?.method === 'bank_transfer_qr'
  const isFakeMethod = instructions?.method === 'none'
  const showFakeButton = Boolean(session?.fakePaymentEnabled || isFakeMethod)

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t('nav.closeMenu')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 max-h-[min(92dvh,40rem)] overflow-y-auto rounded-t-2xl border border-border bg-surface-raised pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="truncate text-sm font-semibold text-text">
            {phase === 'success' ? t('credits.dialog.success') : t('credits.dialog.title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text"
            aria-label={t('nav.closeMenu')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {phase === 'loading' && (
            <p className="text-sm text-text-muted">{t('credits.dialog.loading')}</p>
          )}

          {phase === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-warning">{t(errorKey)}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                {t('credits.dialog.close')}
              </button>
            </div>
          )}

          {phase === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-credit">{t('credits.dialog.successHint')}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                {t('credits.dialog.close')}
              </button>
            </div>
          )}

          {phase === 'pay' && session && instructions && (
            <>
              <p className="text-sm text-text-muted">
                {t('credits.dialog.payingFor', { name: pkg.name })}
              </p>
              <p className="text-lg font-semibold tabular-nums text-text">
                {formatVnd(instructions.amountVnd, uiLocale)} {instructions.currency || 'VND'}
              </p>

              {isQr && instructions.qrImageUrl ? (
                <div className="flex justify-center rounded-xl border border-border bg-white p-3">
                  <img
                    src={instructions.qrImageUrl}
                    alt={t('credits.dialog.qrAlt')}
                    className="h-48 w-48 object-contain"
                  />
                </div>
              ) : null}

              {isQr ? (
                <dl className="space-y-2 text-sm">
                  {instructions.bankName || instructions.bankCode ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-muted">{t('credits.dialog.bank')}</dt>
                      <dd className="text-right text-text">
                        {[instructions.bankName, instructions.bankCode].filter(Boolean).join(' · ')}
                      </dd>
                    </div>
                  ) : null}
                  {instructions.bankAccountNumber ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-text-muted">{t('credits.dialog.account')}</dt>
                      <dd className="text-right font-mono tabular-nums text-text">
                        {instructions.bankAccountNumber}
                      </dd>
                    </div>
                  ) : null}
                  {instructions.accountHolder ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-muted">{t('credits.dialog.holder')}</dt>
                      <dd className="text-right text-text">{instructions.accountHolder}</dd>
                    </div>
                  ) : null}
                  {instructions.transferContent ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-text-muted">{t('credits.dialog.content')}</dt>
                      <dd className="flex flex-col items-end gap-1">
                        <span className="font-mono text-text">{instructions.transferContent}</span>
                        <button
                          type="button"
                          onClick={() => void copyText(instructions.transferContent!)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {copied ? t('credits.dialog.copied') : t('credits.dialog.copy')}
                        </button>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <p className="text-xs text-text-muted">
                {isFakeMethod ? t('credits.dialog.waitingFake') : t('credits.dialog.waiting')}
              </p>

              {showFakeButton ? (
                <button
                  type="button"
                  disabled={fakeBusy}
                  onClick={() => void handleFakeTopup()}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-60"
                >
                  {fakeBusy ? t('credits.dialog.fakeBusy') : t('credits.dialog.fakeTopup')}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
