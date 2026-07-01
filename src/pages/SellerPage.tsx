import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { getAccount } from '../api/emailAuth'
import {
  listSellerPayoutHistory,
  listSellerSales,
  type SellerPayoutDto,
  type SellerSaleDto,
} from '../api/sellerPayout'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

type Tab = 'sales' | 'history'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

const TAB_LABEL_KEYS: Record<Tab, TranslationKey> = {
  sales: 'seller.tabSales',
  history: 'seller.tabHistory',
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

function formatDetail(detail: unknown): string | null {
  if (detail == null) {
    return null
  }
  if (typeof detail === 'string') {
    return detail.trim() || null
  }
  try {
    const text = JSON.stringify(detail)
    return text === '{}' ? null : text
  } catch {
    return null
  }
}

function SaleCard({ sale, locale }: { sale: SellerSaleDto; locale: string }) {
  const { t } = useLanguagePair()

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <h3 className="text-base font-semibold text-text">{sale.productName}</h3>
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div>
          <dt className="inline">{t('seller.saleCredits')}: </dt>
          <dd className="inline tabular-nums text-credit">{sale.creditAmount}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">{t('seller.soldAt')}: </dt>
          <dd className="inline">{formatWhen(sale.soldAt, locale)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">{t('seller.buyerId')}: </dt>
          <dd className="inline font-mono text-[11px]">{sale.buyerId}</dd>
        </div>
      </dl>
    </article>
  )
}

function PayoutCard({ payout, locale }: { payout: SellerPayoutDto; locale: string }) {
  const { t } = useLanguagePair()
  const detailText = formatDetail(payout.detail)
  const isIncrease = payout.direction === 'increase'

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-base font-semibold tabular-nums text-credit">
          {isIncrease ? '+' : '−'}
          {payout.creditAmount}
        </p>
        <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">
          {payout.channel || payout.direction}
        </span>
      </div>
      <dl className="mt-3 grid gap-1 text-xs text-text-muted">
        <div>
          <dt className="inline">{t('seller.payoutAt')}: </dt>
          <dd className="inline">{formatWhen(payout.createdAt, locale)}</dd>
        </div>
        {detailText ? (
          <div>
            <dt className="inline">{t('seller.payoutDetail')}: </dt>
            <dd className="mt-0.5 break-all font-mono text-[11px]">{detailText}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  )
}

export function SellerPage() {
  const { t, uiLocale } = useLanguagePair()
  const [tab, setTab] = useState<Tab>('sales')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [sales, setSales] = useState<SellerSaleDto[]>([])
  const [payouts, setPayouts] = useState<SellerPayoutDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoadState({ phase: 'loading' })
    try {
      const account = await getAccount()
      if (tab === 'sales') {
        const res = await listSellerSales(account.userId, { page, limit: 20 })
        setSales(res.sales)
        setTotalPages(Math.max(1, res.pagination.totalPages))
      } else {
        const res = await listSellerPayoutHistory(account.userId)
        setPayouts(res.payouts)
      }
      setLoadState({ phase: 'ready' })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('seller.errorCode', { code: err.code })
          : t('seller.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [tab, page, t])

  useEffect(() => {
    if (tab === 'sales') {
      setPage(1)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {t('seller.title')}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">{t('seller.description')}</p>

      <div
        className="mt-6 flex gap-1 rounded-xl border border-border bg-surface-raised p-1"
        role="tablist"
        aria-label={t('seller.tabsLabel')}
      >
        {(['sales', 'history'] as const).map((key) => (
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
            {t(TAB_LABEL_KEYS[key])}
          </button>
        ))}
      </div>

      <section className="mt-6" aria-live="polite">
        {loadState.phase === 'loading' && (
          <p className="text-sm text-text-muted">{t('seller.loading')}</p>
        )}
        {loadState.phase === 'error' && (
          <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
            {loadState.message}
            <button type="button" onClick={() => void load()} className="ml-3 font-medium underline">
              {t('seller.retryLoad')}
            </button>
          </div>
        )}
        {loadState.phase === 'ready' && tab === 'sales' && (
          <>
            {sales.length === 0 ? (
              <p className="text-sm text-text-muted">{t('seller.emptySales')}</p>
            ) : (
              <ul className="grid gap-3 sm:gap-4">
                {sales.map((sale) => (
                  <li key={sale.transactionId}>
                    <SaleCard sale={sale} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-text disabled:opacity-40"
                >
                  {t('products.pagePrev')}
                </button>
                <span className="text-text-muted">
                  {t('products.pageInfo', { page, totalPages })}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-text disabled:opacity-40"
                >
                  {t('products.pageNext')}
                </button>
              </div>
            )}
          </>
        )}
        {loadState.phase === 'ready' && tab === 'history' && (
          payouts.length === 0 ? (
            <p className="text-sm text-text-muted">{t('seller.emptyHistory')}</p>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {payouts.map((payout) => (
                <li key={payout.id}>
                  <PayoutCard payout={payout} locale={locale} />
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </main>
  )
}
