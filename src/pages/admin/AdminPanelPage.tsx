import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  listAdminSellerBalances,
  recordAdminSellerPayouts,
  syncAdminCreditPackages,
  type CreditPackageInput,
  type RecordSellerPayoutEntry,
  type SellerBalanceDto,
} from '../../api/admin'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type Tab = 'balances' | 'payout' | 'packages'

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
}

const EMPTY_PACKAGE: CreditPackageInput = {
  id: '',
  name: '',
  amount: 1000,
  term: 'MONTHLY',
  monthCount: 1,
}

function parseDetailJson(raw: string): unknown | undefined {
  const trimmed = raw.trim()
  if (!trimmed) {
    return undefined
  }
  return JSON.parse(trimmed) as unknown
}

export function AdminPanelPage() {
  const { t, uiLocale } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()
  const [tab, setTab] = useState<Tab>('balances')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [balances, setBalances] = useState<SellerBalanceDto[]>([])
  const [packages, setPackages] = useState<CreditPackageInput[]>([])
  const [payoutDraft, setPayoutDraft] = useState<PayoutDraft>({
    userId: '',
    creditAmount: '',
    direction: 'increase',
    channel: 'bank',
    detailJson: '',
  })
  const [payoutBusy, setPayoutBusy] = useState(false)
  const [payoutMessage, setPayoutMessage] = useState<string | null>(null)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

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

  const handleSyncPackages = useCallback(async () => {
    if (syncBusy || !secret) {
      return
    }
    for (const pkg of packages) {
      if (!pkg.id.trim() || !pkg.name.trim() || pkg.amount <= 0 || pkg.monthCount <= 0) {
        setSyncMessage(t('admin.packages.validation'))
        return
      }
    }
    setSyncBusy(true)
    setSyncMessage(null)
    try {
      const synced = await syncAdminCreditPackages(
        secret,
        packages.map((pkg) => ({
          id: pkg.id.trim(),
          name: pkg.name.trim(),
          amount: pkg.amount,
          term: pkg.term.trim(),
          monthCount: pkg.monthCount,
        })),
      )
      setPackages(
        synced.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          amount: pkg.amount,
          term: pkg.term,
          monthCount: pkg.monthCount,
        })),
      )
      setSyncMessage(t('admin.packages.syncSuccess', { count: synced.length }))
      setLastSyncAt(new Date().toISOString())
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setSyncMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setSyncBusy(false)
    }
  }, [syncBusy, packages, secret, t, navigate])

  const packageRows = useMemo(
    () =>
      packages.map((pkg, index) => (
        <tr key={index} className="border-b border-border/60">
          <td className="px-2 py-2">
            <input
              value={pkg.id}
              onChange={(e) =>
                setPackages((prev) =>
                  prev.map((row, i) => (i === index ? { ...row, id: e.target.value } : row)),
                )
              }
              className="w-full min-w-[7rem] rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-mono"
            />
          </td>
          <td className="px-2 py-2">
            <input
              value={pkg.name}
              onChange={(e) =>
                setPackages((prev) =>
                  prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                )
              }
              className="w-full min-w-[10rem] rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
            />
          </td>
          <td className="px-2 py-2">
            <input
              type="number"
              min={1}
              value={pkg.amount}
              onChange={(e) =>
                setPackages((prev) =>
                  prev.map((row, i) =>
                    i === index ? { ...row, amount: Number.parseInt(e.target.value, 10) || 0 } : row,
                  ),
                )
              }
              className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs tabular-nums"
            />
          </td>
          <td className="px-2 py-2">
            <select
              value={pkg.term}
              onChange={(e) =>
                setPackages((prev) =>
                  prev.map((row, i) => (i === index ? { ...row, term: e.target.value } : row)),
                )
              }
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
            >
              <option value="MONTHLY">{t('admin.packages.termMonthly')}</option>
              <option value="YEARLY">{t('admin.packages.termYearly')}</option>
            </select>
          </td>
          <td className="px-2 py-2">
            <input
              type="number"
              min={1}
              value={pkg.monthCount}
              onChange={(e) =>
                setPackages((prev) =>
                  prev.map((row, i) =>
                    i === index
                      ? { ...row, monthCount: Number.parseInt(e.target.value, 10) || 0 }
                      : row,
                  ),
                )
              }
              className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs tabular-nums"
            />
          </td>
          <td className="px-2 py-2">
            <button
              type="button"
              onClick={() => setPackages((prev) => prev.filter((_, i) => i !== index))}
              className="text-xs text-warning hover:underline"
            >
              {t('admin.packages.remove')}
            </button>
          </td>
        </tr>
      )),
    [packages, t],
  )

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
          <button
            type="button"
            onClick={handleExit}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-muted transition hover:border-warning/40 hover:text-text"
          >
            {t('admin.panel.exit')}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div
          className="flex gap-1 rounded-xl border border-border bg-surface-raised p-1"
          role="tablist"
          aria-label={t('admin.tabsLabel')}
        >
          {(['balances', 'payout', 'packages'] as const).map((key) => (
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

          {tab === 'packages' && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">{t('admin.packages.hint')}</p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-raised text-xs text-text-muted">
                    <tr>
                      <th className="px-2 py-2 font-medium">{t('admin.packages.id')}</th>
                      <th className="px-2 py-2 font-medium">{t('admin.packages.name')}</th>
                      <th className="px-2 py-2 font-medium">{t('admin.packages.amount')}</th>
                      <th className="px-2 py-2 font-medium">{t('admin.packages.term')}</th>
                      <th className="px-2 py-2 font-medium">{t('admin.packages.monthCount')}</th>
                      <th className="px-2 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>{packageRows}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPackages((prev) => [...prev, { ...EMPTY_PACKAGE }])}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text"
                >
                  {t('admin.packages.add')}
                </button>
                <button
                  type="button"
                  disabled={syncBusy}
                  onClick={() => void handleSyncPackages()}
                  className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent disabled:opacity-60"
                >
                  {syncBusy ? t('admin.packages.syncing') : t('admin.packages.sync')}
                </button>
              </div>
              {syncMessage ? (
                <p role="status" className="text-sm text-text-muted">
                  {syncMessage}
                </p>
              ) : null}
              {lastSyncAt ? (
                <p className="text-xs text-text-muted">
                  {t('admin.packages.lastSync', {
                    when: new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(lastSyncAt)),
                  })}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
