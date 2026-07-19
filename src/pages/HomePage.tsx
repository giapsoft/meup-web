import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getAccount } from '../api/emailAuth'
import {
  listOwnedProducts,
  listProductCreateRequests,
  type OwnedProductDto,
  type ProductCreateRequestSummaryDto,
} from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { findLanguage } from '../data/mock'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

type ContinueTarget =
  | { kind: 'job'; request: ProductCreateRequestSummaryDto }
  | { kind: 'product'; product: OwnedProductDto }

function isActiveCreateRequest(status: string): boolean {
  return status === 'pending' || status === 'working'
}

function requestTitle(request: ProductCreateRequestSummaryDto): string {
  return request.title?.trim() || request.productName?.trim() || request.id
}

export function HomePage() {
  const { nativeLang, studyLang, t } = useLanguagePair()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [ownedCount, setOwnedCount] = useState(0)
  const [activeJobs, setActiveJobs] = useState(0)
  const [continueTarget, setContinueTarget] = useState<ContinueTarget | null>(null)

  const studyLabel = useMemo(() => {
    return findLanguage(studyLang)?.name ?? studyLang
  }, [studyLang])

  const load = useCallback(async () => {
    setLoadState({ phase: 'loading' })
    try {
      const account = await getAccount()
      const [ownedRes, requestsRes] = await Promise.all([
        listOwnedProducts(account.userId, { nativeLang, studyLang }),
        listProductCreateRequests({ nativeLang, studyLang, page: 1, limit: 20 }),
      ])

      const owned = ownedRes.products
      const requests = requestsRes.requests
      const active = requests.filter((r) => isActiveCreateRequest(r.status))

      setOwnedCount(owned.length)
      setActiveJobs(active.length)

      if (active.length > 0) {
        const newest = [...active].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0]
        setContinueTarget({ kind: 'job', request: newest })
      } else if (owned.length > 0) {
        const newest = [...owned].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0]
        setContinueTarget({ kind: 'product', product: newest })
      } else {
        setContinueTarget(null)
      }

      setLoadState({ phase: 'ready' })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('products.errorCode', { code: err.code })
          : t('products.errorGeneric')
      setLoadState({ phase: 'error', message })
      setContinueTarget(null)
      setOwnedCount(0)
      setActiveJobs(0)
    }
  }, [nativeLang, studyLang, t])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-10">
      <section className="mb-6 sm:mb-8">
        <p className="text-sm font-medium text-accent">{t('home.welcome')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {t('home.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          {t('home.subtitle')}
        </p>
        <p className="mt-3 text-sm text-text-muted">
          {t('home.pairSummary', { study: studyLabel })}
        </p>
      </section>

      {loadState.phase === 'loading' && (
        <p className="mb-6 text-sm text-text-muted">{t('products.loading')}</p>
      )}

      {loadState.phase === 'error' && (
        <div className="mb-6 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
          {loadState.message}
          <button type="button" onClick={() => void load()} className="ml-3 font-medium underline">
            {t('products.retryLoad')}
          </button>
        </div>
      )}

      {loadState.phase === 'ready' && continueTarget && (
        <section className="mb-4">
          {continueTarget.kind === 'job' ? (
            <Link
              to="/products?tab=owned"
              className="block rounded-2xl border border-accent/40 bg-accent-soft p-4 no-underline transition hover:border-accent hover:bg-accent/20 sm:p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                {t('home.continueJobLabel')}
              </p>
              <p className="mt-1 text-base font-semibold text-text">
                {requestTitle(continueTarget.request)}
              </p>
              <p className="mt-1 text-sm text-text-muted">{t('home.continueJobHint')}</p>
            </Link>
          ) : (
            <Link
              to={`/products/${continueTarget.product.productId}/edit`}
              state={{ product: continueTarget.product }}
              className="block rounded-2xl border border-border bg-surface-raised p-4 no-underline transition hover:border-accent/40 hover:bg-surface-hover sm:p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {t('home.continueProductLabel')}
              </p>
              <p className="mt-1 text-base font-semibold text-text">
                {continueTarget.product.name}
              </p>
              <p className="mt-1 text-sm text-text-muted">{t('home.continueProductHint')}</p>
            </Link>
          )}
        </section>
      )}

      <section className="mb-6">
        <Link
          to="/products/new"
          className="flex w-full items-center justify-center rounded-2xl border border-accent/40 bg-accent-soft px-4 py-3.5 text-base font-semibold text-accent no-underline transition hover:border-accent hover:bg-accent/20"
        >
          {t('home.createCta')}
        </Link>
      </section>

      <section
        className="grid grid-cols-2 gap-2 sm:gap-3"
        aria-label={t('home.statsLabel')}
      >
        <Link
          to="/products?tab=owned"
          className="rounded-xl border border-border bg-surface-raised px-2 py-3 text-center no-underline transition hover:border-accent/40 sm:px-3"
        >
          <p className="text-lg font-semibold tabular-nums text-text sm:text-xl">{ownedCount}</p>
          <p className="mt-0.5 text-[11px] text-text-muted sm:text-xs">{t('home.statLibrary')}</p>
        </Link>
        <Link
          to="/products?tab=owned"
          className="rounded-xl border border-border bg-surface-raised px-2 py-3 text-center no-underline transition hover:border-accent/40 sm:px-3"
        >
          <p className="text-lg font-semibold tabular-nums text-text sm:text-xl">{activeJobs}</p>
          <p className="mt-0.5 text-[11px] text-text-muted sm:text-xs">{t('home.statJobs')}</p>
        </Link>
      </section>
    </main>
  )
}
