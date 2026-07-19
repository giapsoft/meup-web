import { useCallback, useEffect, useState } from 'react'
import { listCreditPackages, type CreditPackageDto } from '../api/credits'
import { PaymentCheckoutDialog } from '../components/PaymentCheckoutDialog'
import { useAccount } from '../context/AccountProvider'
import { useLanguagePair } from '../context/LanguagePairProvider'

function formatVnd(amount: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US').format(amount)
  } catch {
    return String(amount)
  }
}

function packageExplainKey(id: string): 'credits.package.monthly.explain' | 'credits.package.yearly.explain' | null {
  if (id === 'monthly') return 'credits.package.monthly.explain'
  if (id === 'yearly') return 'credits.package.yearly.explain'
  return null
}

export function CreditsPage() {
  const { t, uiLocale } = useLanguagePair()
  const { creditBalance } = useAccount()
  const [packages, setPackages] = useState<CreditPackageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<CreditPackageDto | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const list = await listCreditPackages()
      setPackages(list)
    } catch (err) {
      setPackages([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {t('credits.page.title')}
        </h1>
        <p className="max-w-xl text-sm text-text-muted sm:text-base">{t('credits.page.subtitle')}</p>
        <p className="text-sm text-text">
          {t('credits.page.balance')}:{' '}
          <span className="font-semibold tabular-nums text-amber-400">{creditBalance}</span>
        </p>
      </header>

      {loading && <p className="text-sm text-text-muted">{t('credits.page.loading')}</p>}

      {!loading && error && (
        <div className="space-y-3">
          <p className="text-sm text-warning">{t('credits.page.error')}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            {t('credits.page.retry')}
          </button>
        </div>
      )}

      {!loading && !error && packages.length === 0 && (
        <p className="text-sm text-text-muted">{t('credits.page.empty')}</p>
      )}

      {!loading && !error && packages.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {packages.map((pkg) => {
            const explainKey = packageExplainKey(pkg.id)
            return (
              <li key={pkg.id}>
                <button
                  type="button"
                  onClick={() => setSelected(pkg)}
                  className="flex h-full w-full flex-col rounded-2xl border border-border bg-surface-raised p-5 text-left transition hover:border-accent/40 hover:bg-surface-hover"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {pkg.term === 'YEARLY' ? t('credits.package.termYearly') : t('credits.package.termMonthly')}
                  </span>
                  <span className="mt-2 text-lg font-semibold text-text">{pkg.name}</span>
                  <span className="mt-3 text-2xl font-semibold tabular-nums text-text">
                    {formatVnd(pkg.priceVnd, uiLocale)}{' '}
                    <span className="text-base font-medium text-text-muted">
                      {pkg.term === 'YEARLY'
                        ? t('credits.package.priceSuffixYearly', { count: pkg.monthCount })
                        : t('credits.package.priceSuffixMonthly')}
                    </span>
                  </span>
                  <span className="mt-2 text-sm tabular-nums text-amber-400">
                    {t('credits.package.creditsPerMonth', { amount: pkg.amount })}
                  </span>
                  {explainKey ? (
                    <span className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-text-muted">
                      {t(explainKey, { amount: pkg.amount, months: pkg.monthCount })}
                    </span>
                  ) : null}
                  <span className="mt-4 text-sm font-semibold text-accent">
                    {t('credits.package.select')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected ? (
        <PaymentCheckoutDialog package={selected} onClose={() => setSelected(null)} />
      ) : null}
    </main>
  )
}
