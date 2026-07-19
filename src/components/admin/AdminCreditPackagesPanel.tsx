import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CREDIT_PACKAGE_MONTHLY_KEY,
  CREDIT_PACKAGE_YEARLY_KEY,
  listAdminSystemConfig,
  updateAdminSystemConfig,
  type AdminSystemConfigEntry,
} from '../../api/admin'
import { ApiError } from '../../api/client'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { clearAdminSecret } from '../../utils/adminSecretStorage'

const KEY_MONTHLY = CREDIT_PACKAGE_MONTHLY_KEY
const KEY_YEARLY = CREDIT_PACKAGE_YEARLY_KEY

export type CreditPackageFormDraft = {
  id: 'monthly' | 'yearly'
  name: string
  amount: string
  priceVnd: string
  term: 'MONTHLY' | 'YEARLY'
  monthCount: number
  active: boolean
}

const DEFAULTS: Record<'monthly' | 'yearly', CreditPackageFormDraft> = {
  monthly: {
    id: 'monthly',
    name: 'Gói tháng',
    amount: '500',
    priceVnd: '50000',
    term: 'MONTHLY',
    monthCount: 1,
    active: true,
  },
  yearly: {
    id: 'yearly',
    name: 'Gói năm',
    amount: '700',
    priceVnd: '500000',
    term: 'YEARLY',
    monthCount: 12,
    active: true,
  },
}

function parsePackageJson(raw: string, id: 'monthly' | 'yearly'): CreditPackageFormDraft {
  const fallback = DEFAULTS[id]
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      id,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallback.name,
      amount: String(typeof parsed.amount === 'number' ? parsed.amount : fallback.amount),
      priceVnd: String(typeof parsed.priceVnd === 'number' ? parsed.priceVnd : fallback.priceVnd),
      term: fallback.term,
      monthCount: fallback.monthCount,
      active: typeof parsed.active === 'boolean' ? parsed.active : true,
    }
  } catch {
    return { ...fallback }
  }
}

function draftFromConfig(
  entries: AdminSystemConfigEntry[],
  id: 'monthly' | 'yearly',
  key: string,
): CreditPackageFormDraft {
  const entry = entries.find((e) => e.key === key)
  const raw = (entry?.value || entry?.defaultValue || '').trim()
  if (!raw) {
    return { ...DEFAULTS[id] }
  }
  return parsePackageJson(raw, id)
}

function toConfigValue(draft: CreditPackageFormDraft): string {
  return JSON.stringify({
    id: draft.id,
    name: draft.name.trim(),
    amount: Number.parseInt(draft.amount, 10),
    priceVnd: Number.parseInt(draft.priceVnd, 10),
    term: draft.term,
    monthCount: draft.monthCount,
    active: draft.active,
  })
}

type AdminCreditPackagesPanelProps = {
  secret: string
}

export function AdminCreditPackagesPanel({ secret }: AdminCreditPackagesPanelProps) {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const [monthly, setMonthly] = useState<CreditPackageFormDraft>(DEFAULTS.monthly)
  const [yearly, setYearly] = useState<CreditPackageFormDraft>(DEFAULTS.yearly)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<'monthly' | 'yearly' | 'both' | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const entries = await listAdminSystemConfig(secret)
      setMonthly(draftFromConfig(entries, 'monthly', KEY_MONTHLY))
      setYearly(draftFromConfig(entries, 'yearly', KEY_YEARLY))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setLoadError(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setLoading(false)
    }
  }, [secret, navigate, t])

  useEffect(() => {
    void load()
  }, [load])

  function validate(draft: CreditPackageFormDraft): boolean {
    const amount = Number.parseInt(draft.amount, 10)
    const priceVnd = Number.parseInt(draft.priceVnd, 10)
    return Boolean(draft.name.trim()) && amount > 0 && priceVnd > 0
  }

  async function saveOne(which: 'monthly' | 'yearly') {
    const draft = which === 'monthly' ? monthly : yearly
    if (!validate(draft)) {
      setMessageOk(false)
      setMessage(t('admin.packages.validation'))
      return
    }
    setBusyKey(which)
    setMessage(null)
    try {
      const key = which === 'monthly' ? KEY_MONTHLY : KEY_YEARLY
      await updateAdminSystemConfig(secret, [{ key, value: toConfigValue(draft) }])
      setMessageOk(true)
      setMessage(t('admin.packages.saveSuccess'))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setMessageOk(false)
      setMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setBusyKey(null)
    }
  }

  async function saveBoth() {
    if (!validate(monthly) || !validate(yearly)) {
      setMessageOk(false)
      setMessage(t('admin.packages.validation'))
      return
    }
    setBusyKey('both')
    setMessage(null)
    try {
      await updateAdminSystemConfig(secret, [
        { key: KEY_MONTHLY, value: toConfigValue(monthly) },
        { key: KEY_YEARLY, value: toConfigValue(yearly) },
      ])
      setMessageOk(true)
      setMessage(t('admin.packages.saveSuccessBoth'))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminSecret()
        navigate('/admin', { replace: true })
        return
      }
      setMessageOk(false)
      setMessage(
        err instanceof ApiError ? t('admin.errorCode', { code: err.code }) : t('admin.errorGeneric'),
      )
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-text-muted">{t('admin.loading')}</p>
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
        {loadError}
        <button type="button" onClick={() => void load()} className="ml-3 font-medium underline">
          {t('admin.retryLoad')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">{t('admin.packages.hint')}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <PackageFormCard
          title={t('admin.packages.monthlyTitle')}
          draft={monthly}
          onChange={setMonthly}
          busy={busyKey !== null}
          onSave={() => void saveOne('monthly')}
          saving={busyKey === 'monthly'}
        />
        <PackageFormCard
          title={t('admin.packages.yearlyTitle')}
          draft={yearly}
          onChange={setYearly}
          busy={busyKey !== null}
          onSave={() => void saveOne('yearly')}
          saving={busyKey === 'yearly'}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busyKey !== null}
          onClick={() => void saveBoth()}
          className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent disabled:opacity-60"
        >
          {busyKey === 'both' ? t('admin.packages.saving') : t('admin.packages.saveBoth')}
        </button>
        {message ? (
          <p role="status" className={`text-sm ${messageOk ? 'text-credit' : 'text-warning'}`}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

type PackageFormCardProps = {
  title: string
  draft: CreditPackageFormDraft
  onChange: (next: CreditPackageFormDraft) => void
  busy: boolean
  saving: boolean
  onSave: () => void
}

function PackageFormCard({ title, draft, onChange, busy, saving, onSave }: PackageFormCardProps) {
  const { t } = useLanguagePair()

  return (
    <div className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <p className="mt-0.5 font-mono text-xs text-text-muted">{draft.id}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={draft.active}
            disabled={busy}
            onChange={(e) => onChange({ ...draft, active: e.target.checked })}
          />
          {t('admin.packages.active')}
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">{t('admin.packages.name')}</span>
          <input
            value={draft.name}
            disabled={busy}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">{t('admin.packages.amount')}</span>
          <input
            type="number"
            min={1}
            value={draft.amount}
            disabled={busy}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">{t('admin.packages.priceVnd')}</span>
          <input
            type="number"
            min={1}
            value={draft.priceVnd}
            disabled={busy}
            onChange={(e) => onChange({ ...draft, priceVnd: e.target.value })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <p className="text-xs text-text-muted">
          {t('admin.packages.termReadonly', {
            term: draft.term === 'YEARLY' ? t('admin.packages.termYearly') : t('admin.packages.termMonthly'),
            months: draft.monthCount,
          })}
        </p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="mt-4 rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text disabled:opacity-60"
      >
        {saving ? t('admin.packages.saving') : t('admin.packages.save')}
      </button>
    </div>
  )
}
