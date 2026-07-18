import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  adjustAdminUserCredits,
  listAdminSellerBalances,
  recordAdminSellerPayouts,
  type AdminCreditAdjustResult,
  type RecordSellerPayoutEntry,
  type SellerBalanceDto,
} from '../../api/admin'
import { AdminCreditPackagesPanel } from '../../components/admin/AdminCreditPackagesPanel'
import {
  AdminUserTargetFields,
  parseAdminUserTargets,
  type AdminUserTargetDraft,
} from '../../components/admin/AdminUserTargetFields'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type Tab = 'balances' | 'payout' | 'packages' | 'credits'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

type PayoutDraft = {
  userId: string
  creditAmount: string
  direction: 'increase' | 'decrease'
  channel: string
  detailJson: string
}

const TAB_KEYS: Record<Tab, TranslationKey> = {
  balances: 'admin.tab.balances',
  payout: 'admin.tab.payout',
  packages: 'admin.tab.packages',
  credits: 'admin.tab.credits',
}

function parseDetailJson(raw: string): unknown | undefined {
  const trimmed = raw.trim()
  if (!trimmed) {
    return undefined
  }
  return JSON.parse(trimmed) as unknown
}

export function AdminPanelPage() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()
  const [tab, setTab] = useState<Tab>('balances')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [balances, setBalances] = useState<SellerBalanceDto[]>([])
  const [payoutDraft, setPayoutDraft] = useState<PayoutDraft>({
    userId: '',
    creditAmount: '',
    direction: 'increase',
    channel: 'bank',
    detailJson: '',
  })
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null)
  const [creditTarget, setCreditTarget] = useState<AdminUserTargetDraft>({
    userId: '',
    email: '',
    deviceOrderInput: '',
  })
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDirection, setCreditDirection] = useState<'increase' | 'decrease'>('increase')
  const [creditNote, setCreditNote] = useState('')
  const [creditBusy, setCreditBusy] = useState(false)
  const [creditMessage, setCreditMessage] = useState<string | null>(null)
  const [creditResults, setCreditResults] = useState<AdminCreditAdjustResult[]>([])

  const loadBalances = useCallback(async () => {
    if (!secret) {
      return
    }
    setLoadState({ phase: 'loading' })
    try {
      const next = await listAdminSellerBalances(secret)
      setBalances(next)
      setLoadState({ phase: 'ready' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      const message =
        err instanceof ApiError
          ? t('admin.errorCode', { code: err.code })
          : t('admin.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [secret, navigate, t])

  useEffect(() => {
    if (tab === 'balances' || tab === 'payout') {
      void loadBalances()
    } else {
      setLoadState({ phase: 'ready' })
    }
  }, [tab, loadBalances])

  const handleExit = useCallback(() => {
    clearAdminSecret()
    navigate('/admin', { replace: true })
  }, [navigate])

  const openPayoutForSeller = useCallback((userId: string, payableCredits: number) => {
    setPayoutDraft({
      userId,
      creditAmount: payableCredits > 0 ? String(payableCredits) : '',
      direction: 'increase',
      channel: 'bank',
      detailJson: '',
    })
    setPayoutMessage(null)
    setTab('payout')
  }, [])

  const handleRecordPayout = useCallback(async () => {
    if (payoutBusy || !secret) {
      return
    }
    const userId = payoutDraft.userId.trim()
    const creditAmount = Number.parseInt(payoutDraft.creditAmount, 10)
    const channel = payoutDraft.channel.trim()
    if (!userId || !Number.isFinite(creditAmount) || creditAmount <= 0 || !channel) {
      setPayoutMessage(t('admin.payout.validation'))
      return
    }
    let detail: unknown
    try {
      detail = parseDetailJson(payoutDraft.detailJson)
    } catch {
      setPayoutMessage(t('admin.payout.detailInvalid'))
      return
    }
    const entry: RecordSellerPayoutEntry = {
      userId,
      creditAmount,
      direction: payoutDraft.direction,
      channel,
      ...(detail !== undefined ? { detail } : {}),
    }
    setPayoutBusy(true)
    setPayoutMessage(null)
    try {
      await recordAdminSellerPayouts(secret, [entry])
      setPayoutMessage(t('admin.payout.success'))
      setPayoutDraft((prev) => ({ ...prev, creditAmount: '', detailJson: '' }))
      await loadBalances()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setPayoutMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setPayoutBusy(false)
    }
  }, [payoutBusy, payoutDraft, secret, t, loadBalances, navigate])

  const handleAdjustCredits = useCallback(async () => {
    if (creditBusy || !secret) {
      return
    }
    const parsedTargets = parseAdminUserTargets(creditTarget, t)
    if (!parsedTargets.ok) {
      setCreditMessage(parsedTargets.message)
      return
    }
    const amount = Number.parseInt(creditAmount.trim(), 10)
    const note = creditNote.trim()
    if (!Number.isFinite(amount) || amount <= 0 || !note) {
      setCreditMessage(t('admin.credits.validation'))
      return
    }

    setCreditBusy(true)
    setCreditMessage(null)
    setCreditResults([])
    try {
      const adjustments = await adjustAdminUserCredits(secret, {
        ...parsedTargets.body,
        direction: creditDirection,
        creditAmount: amount,
        note,
      })
      setCreditResults(adjustments)
      setCreditMessage(t('admin.credits.success', { count: adjustments.length }))
      setCreditTarget({ userId: '', email: '', deviceOrderInput: '' })
      setCreditAmount('')
      setCreditNote('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      if (err instanceof ApiError) {
        const codeKey = {
          user_not_found: 'admin.credits.error.user_not_found',
          insufficient_credits: 'admin.credits.error.insufficient_credits',
        }[err.code] as TranslationKey | undefined
        setCreditMessage(codeKey ? t(codeKey) : t('admin.errorCode', { code: err.code }))
        return
      }
      setCreditMessage(t('admin.errorGeneric'))
    } finally {
      setCreditBusy(false)
    }
  }, [creditBusy, creditTarget, creditAmount, creditDirection, creditNote, secret, t, navigate])

  if (!secret) {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
            <h1 className="text-lg font-semibold text-text">{t('admin.panel.title')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/config"
              className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-muted no-underline transition hover:border-accent/40 hover:text-text"
            >
              {t('admin.config.open')}
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
        <div
          className="flex gap-1 rounded-xl border border-border bg-surface-raised p-1"
          role="tablist"
          aria-label={t('admin.tabsLabel')}
        >
          {(['balances', 'payout', 'packages', 'credits'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={[
                'flex-1 rounded-lg px-1.5 py-2 text-xs font-medium transition sm:px-2 sm:text-sm',
                tab === key
                  ? 'bg-surface-card text-text shadow-sm'
                  : 'text-text-muted hover:text-text',
              ].join(' ')}
            >
              {t(TAB_KEYS[key])}
            </button>
          ))}
        </div>

        <section className="mt-6" aria-live="polite">
          {tab === 'balances' && (
            <>
              {loadState.phase === 'loading' && (
                <p className="text-sm text-text-muted">{t('admin.loading')}</p>
              )}
              {loadState.phase === 'error' && (
                <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
                  {loadState.message}
                  <button
                    type="button"
                    onClick={() => void loadBalances()}
                    className="ml-3 font-medium underline"
                  >
                    {t('admin.retryLoad')}
                  </button>
                </div>
              )}
              {loadState.phase === 'ready' &&
                (balances.length === 0 ? (
                  <p className="text-sm text-text-muted">{t('admin.balances.empty')}</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-surface-raised text-xs text-text-muted">
                        <tr>
                          <th className="px-3 py-2 font-medium">{t('admin.balances.userId')}</th>
                          <th className="px-3 py-2 font-medium">{t('admin.balances.earned')}</th>
                          <th className="px-3 py-2 font-medium">{t('admin.balances.paid')}</th>
                          <th className="px-3 py-2 font-medium">{t('admin.balances.payable')}</th>
                          <th className="px-3 py-2 font-medium">{t('admin.balances.action')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {balances.map((row) => (
                          <tr key={row.userId} className="border-t border-border/60">
                            <td className="px-3 py-2 font-mono text-xs">{row.userId}</td>
                            <td className="px-3 py-2 tabular-nums">{row.earnedCredits}</td>
                            <td className="px-3 py-2 tabular-nums">{row.totalSellerPayout}</td>
                            <td className="px-3 py-2 tabular-nums text-credit">{row.payableCredits}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => openPayoutForSeller(row.userId, row.payableCredits)}
                                className="text-xs font-medium text-accent hover:underline"
                              >
                                {t('admin.balances.record')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </>
          )}

          {tab === 'payout' && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
              <h2 className="text-base font-semibold text-text">{t('admin.payout.title')}</h2>
              <p className="mt-1 text-sm text-text-muted">{t('admin.payout.hint')}</p>
              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.userId')}</span>
                  <input
                    value={payoutDraft.userId}
                    onChange={(e) => setPayoutDraft((prev) => ({ ...prev, userId: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.amount')}</span>
                  <input
                    type="number"
                    min={1}
                    value={payoutDraft.creditAmount}
                    onChange={(e) =>
                      setPayoutDraft((prev) => ({ ...prev, creditAmount: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.direction')}</span>
                  <select
                    value={payoutDraft.direction}
                    onChange={(e) =>
                      setPayoutDraft((prev) => ({
                        ...prev,
                        direction: e.target.value as 'increase' | 'decrease',
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <option value="increase">{t('admin.payout.directionIncrease')}</option>
                    <option value="decrease">{t('admin.payout.directionDecrease')}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.channel')}</span>
                  <input
                    value={payoutDraft.channel}
                    onChange={(e) => setPayoutDraft((prev) => ({ ...prev, channel: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.detail')}</span>
                  <textarea
                    value={payoutDraft.detailJson}
                    onChange={(e) => setPayoutDraft((prev) => ({ ...prev, detailJson: e.target.value }))}
                    rows={3}
                    placeholder='{"transferRef":"FT123"}'
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-mono"
                  />
                </label>
              </div>
              {payoutMessage ? (
                <p
                  role="status"
                  className={`mt-3 text-sm ${payoutMessage === t('admin.payout.success') ? 'text-credit' : 'text-warning'}`}
                >
                  {payoutMessage}
                </p>
              ) : null}
              <button
                type="button"
                disabled={payoutBusy}
                onClick={() => void handleRecordPayout()}
                className="mt-4 rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
              >
                {payoutBusy ? t('admin.payout.submitting') : t('admin.payout.submit')}
              </button>
            </div>
          )}

          {tab === 'packages' && <AdminCreditPackagesPanel secret={secret} />}

          {tab === 'credits' && (
            <div className="max-w-xl rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
              <h2 className="text-base font-semibold text-text">{t('admin.credits.title')}</h2>
              <p className="mt-1 text-sm text-text-muted">{t('admin.credits.hint')}</p>
              <div className="mt-4 space-y-4">
                <AdminUserTargetFields
                  draft={creditTarget}
                  onChange={setCreditTarget}
                  disabled={creditBusy}
                  idPrefix="admin-credits"
                  t={t}
                />
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.payout.direction')}</span>
                  <select
                    value={creditDirection}
                    onChange={(e) =>
                      setCreditDirection(e.target.value as 'increase' | 'decrease')
                    }
                    disabled={creditBusy}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="increase">{t('admin.payout.directionIncrease')}</option>
                    <option value="decrease">{t('admin.payout.directionDecrease')}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.credits.amount')}</span>
                  <input
                    type="number"
                    min={1}
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    disabled={creditBusy}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums disabled:opacity-60"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-text">{t('admin.credits.note')}</span>
                  <textarea
                    value={creditNote}
                    onChange={(e) => setCreditNote(e.target.value)}
                    disabled={creditBusy}
                    rows={3}
                    placeholder={t('admin.credits.notePlaceholder')}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm disabled:opacity-60"
                  />
                </label>
              </div>
              {creditMessage ? (
                <p
                  role="status"
                  className={`mt-3 text-sm ${creditResults.length > 0 ? 'text-credit' : 'text-warning'}`}
                >
                  {creditMessage}
                </p>
              ) : null}
              {creditResults.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-text-muted">
                  {creditResults.map((row) => {
                    const label = row.email.trim() || row.userId
                    const deltaLabel = row.delta > 0 ? `+${row.delta}` : String(row.delta)
                    return (
                      <li key={row.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                        {t('admin.credits.resultLine', {
                          label,
                          delta: deltaLabel,
                          balance: row.newBalance,
                        })}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={creditBusy}
                onClick={() => void handleAdjustCredits()}
                className="mt-4 rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
              >
                {creditBusy ? t('admin.credits.submitting') : t('admin.credits.submit')}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
