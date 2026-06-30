import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getAccount } from '../api/emailAuth'
import {
  listOwnedProducts,
  listProductCreateRequests,
  type OwnedProductDto,
  type ProductCreateRequestSummaryDto,
  type ProductSettingsDto,
} from '../api/product'
import { getProductCreateProgress, type ProductCreateProgressDto } from '../api/productCreate'
import { ProductSettingsModal } from '../components/ProductSettingsModal'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

type Tab = 'owned' | 'requests'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

const REQUEST_STATUS_KEYS: Record<string, TranslationKey> = {
  pending: 'products.status.pending',
  working: 'products.status.working',
  success: 'products.status.success',
  failed: 'products.status.failed',
}

const SHARE_MODE_KEYS: Record<string, TranslationKey> = {
  public: 'products.shareMode.public',
  private: 'products.shareMode.private',
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

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'failed':
      return 'border-warning/40 bg-warning-muted text-warning'
    case 'success':
      return 'border-border bg-surface-raised text-text'
    case 'working':
    case 'pending':
      return 'border-accent/40 bg-accent-soft text-accent'
    default:
      return 'border-border bg-surface-raised text-text-muted'
  }
}

function ProgressPanel({
  progress,
  loading,
}: {
  progress: ProductCreateProgressDto | null
  loading: boolean
}) {
  const { t } = useLanguagePair()

  if (loading) {
    return <p className="mt-3 text-xs text-text-muted">{t('products.progressLoading')}</p>
  }
  if (!progress) {
    return null
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm">
      {progress.progressPercent != null ? (
        <p className="font-medium text-text">
          {t('createAiTitle.done.progressPercent', { percent: progress.progressPercent })}
        </p>
      ) : progress.jobs ? (
        <ul className="space-y-0.5 text-xs text-text-muted">
          <li>{t('createAiTitle.done.jobsSuccess', { count: progress.jobs.success })}</li>
          <li>{t('createAiTitle.done.jobsWorking', { count: progress.jobs.working })}</li>
          <li>{t('createAiTitle.done.jobsPending', { count: progress.jobs.pending })}</li>
          {progress.jobs.failed > 0 && (
            <li className="text-warning">
              {t('createAiTitle.done.jobsFailed', { count: progress.jobs.failed })}
            </li>
          )}
        </ul>
      ) : (
        <p className="text-xs text-text-muted">{progress.status}</p>
      )}
    </div>
  )
}

function OwnedProductCard({
  product,
  locale,
  onOpenSettings,
}: {
  product: OwnedProductDto
  locale: string
  onOpenSettings: () => void
}) {
  const { t } = useLanguagePair()
  const shareKey = SHARE_MODE_KEYS[product.shareMode]

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{product.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {shareKey ? (
            <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">
              {t(shareKey)}
            </span>
          ) : (
            <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs text-text-muted">
              {product.shareMode}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover"
          >
            {t('products.settings.open')}
          </button>
        </div>
      </div>
      {product.description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{product.description}</p>
      ) : null}
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div>
          <dt className="inline">{t('products.creditPrice')}: </dt>
          <dd className="inline tabular-nums">{product.creditPrice}</dd>
        </div>
        <div>
          <dt className="inline">{t('products.updatedAt')}: </dt>
          <dd className="inline">{formatWhen(product.updatedAt, locale)}</dd>
        </div>
      </dl>
      {product.shareMode === 'public' && (
        <Link
          to="/explore"
          className="mt-3 inline-flex text-sm font-medium text-accent no-underline transition hover:underline"
        >
          {t('products.viewOnExplore')}
        </Link>
      )}
    </article>
  )
}

function CreateRequestCard({
  request,
  locale,
}: {
  request: ProductCreateRequestSummaryDto
  locale: string
}) {
  const { t } = useLanguagePair()
  const [progress, setProgress] = useState<ProductCreateProgressDto | null>(null)
  const [progressLoading, setProgressLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const statusKey = REQUEST_STATUS_KEYS[request.status]

  const refreshProgress = useCallback(async () => {
    setProgressLoading(true)
    try {
      const next = await getProductCreateProgress(request.id)
      setProgress(next)
      setExpanded(true)
    } catch {
      setProgress(null)
    } finally {
      setProgressLoading(false)
    }
  }, [request.id])

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{request.productName}</h3>
        <span
          className={[
            'rounded-md border px-2 py-0.5 text-xs font-medium',
            statusBadgeClass(request.status),
          ].join(' ')}
        >
          {statusKey ? t(statusKey) : request.status}
        </span>
      </div>
      {request.productDescription ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{request.productDescription}</p>
      ) : null}
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div>
          <dt className="inline">{t('products.langPair')}: </dt>
          <dd className="inline font-mono">
            {request.nativeLangId} → {request.studyLangId}
          </dd>
        </div>
        <div>
          <dt className="inline">{t('products.totalCredits')}: </dt>
          <dd className="inline tabular-nums">{request.totalCredits}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">{t('products.updatedAt')}: </dt>
          <dd className="inline">{formatWhen(request.updatedAt, locale)}</dd>
        </div>
      </dl>
      <p className="mt-2 font-mono text-[11px] text-text-muted">{request.id}</p>
      {request.status !== 'success' && (
        <button
          type="button"
          onClick={() => void refreshProgress()}
          disabled={progressLoading}
          className="mt-3 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover disabled:opacity-60"
        >
          {t('products.refreshProgress')}
        </button>
      )}
      {expanded && <ProgressPanel progress={progress} loading={progressLoading} />}
    </article>
  )
}

export function ProductsPage() {
  const { t, uiLocale, nativeLang, studyLang, langPair } = useLanguagePair()
  const [tab, setTab] = useState<Tab>('owned')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [owned, setOwned] = useState<OwnedProductDto[]>([])
  const [requests, setRequests] = useState<ProductCreateRequestSummaryDto[]>([])
  const [requestPage, setRequestPage] = useState(1)
  const [requestTotalPages, setRequestTotalPages] = useState(1)
  const [settingsProduct, setSettingsProduct] = useState<OwnedProductDto | null>(null)
  const langPairKey = `${nativeLang}_${studyLang}`
  const prevLangPairRef = useRef(langPairKey)

  const handleSettingsSaved = useCallback((updated: ProductSettingsDto) => {
    setOwned((prev) =>
      prev.map((p) =>
        p.productId === updated.productId
          ? {
              ...p,
              name: updated.name,
              description: updated.description,
              creditPrice: updated.creditPrice,
              shareMode: updated.shareMode,
              updatedAt: updated.updatedAt,
            }
          : p,
      ),
    )
  }, [])

  const load = useCallback(async () => {
    setLoadState({ phase: 'loading' })
    try {
      const account = await getAccount()
      if (tab === 'owned') {
        const res = await listOwnedProducts(account.userId, { nativeLang, studyLang })
        setOwned(res.products)
      } else {
        const res = await listProductCreateRequests(account.userId, {
          nativeLang,
          studyLang,
          page: requestPage,
          limit: 20,
        })
        setRequests(res.requests)
        setRequestTotalPages(Math.max(1, res.pagination.totalPages))
      }
      setLoadState({ phase: 'ready' })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('products.errorCode', { code: err.code })
          : t('products.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [tab, requestPage, nativeLang, studyLang, t])

  useEffect(() => {
    if (prevLangPairRef.current !== langPairKey) {
      prevLangPairRef.current = langPairKey
      if (requestPage !== 1) {
        setRequestPage(1)
        return
      }
    }
    void load()
  }, [load, langPairKey, requestPage])

  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {t('products.my.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">{t('products.my.description')}</p>
          {tab === 'owned' && (
            <p className="mt-1 text-xs text-text-muted">{t('products.filterPair', { pair: langPair })}</p>
          )}
          {tab === 'requests' && (
            <p className="mt-1 text-xs text-text-muted">{t('products.filterPairRequests', { pair: langPair })}</p>
          )}
        </div>
        <Link
          to="/products/new"
          className="inline-flex shrink-0 items-center rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent no-underline transition hover:border-accent hover:bg-accent/20"
        >
          {t('products.createCta')}
        </Link>
      </div>

      <div
        className="mt-6 flex gap-1 rounded-xl border border-border bg-surface-raised p-1"
        role="tablist"
        aria-label={t('products.tabsLabel')}
      >
        {(['owned', 'requests'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key)
              if (key === 'requests') {
                setRequestPage(1)
              }
            }}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition',
              tab === key
                ? 'bg-surface-card text-text shadow-sm'
                : 'text-text-muted hover:text-text',
            ].join(' ')}
          >
            {t(key === 'owned' ? 'products.tabOwned' : 'products.tabRequests')}
          </button>
        ))}
      </div>

      <section className="mt-6" aria-live="polite">
        {loadState.phase === 'loading' && (
          <p className="text-sm text-text-muted">{t('products.loading')}</p>
        )}
        {loadState.phase === 'error' && (
          <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
            {loadState.message}
            <button
              type="button"
              onClick={() => void load()}
              className="ml-3 font-medium underline"
            >
              {t('products.retryLoad')}
            </button>
          </div>
        )}
        {loadState.phase === 'ready' && tab === 'owned' && (
          owned.length === 0 ? (
            <p className="text-sm text-text-muted">{t('products.emptyOwned')}</p>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {owned.map((product) => (
                <li key={product.productId}>
                  <OwnedProductCard
                    product={product}
                    locale={locale}
                    onOpenSettings={() => setSettingsProduct(product)}
                  />
                </li>
              ))}
            </ul>
          )
        )}
        {loadState.phase === 'ready' && tab === 'requests' && (
          <>
            {requests.length === 0 ? (
              <p className="text-sm text-text-muted">{t('products.emptyRequests')}</p>
            ) : (
              <ul className="grid gap-3 sm:gap-4">
                {requests.map((request) => (
                  <li key={request.id}>
                    <CreateRequestCard request={request} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
            {requestTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={requestPage <= 1}
                  onClick={() => setRequestPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-text disabled:opacity-40"
                >
                  {t('products.pagePrev')}
                </button>
                <span className="text-text-muted">
                  {t('products.pageInfo', { page: requestPage, totalPages: requestTotalPages })}
                </span>
                <button
                  type="button"
                  disabled={requestPage >= requestTotalPages}
                  onClick={() => setRequestPage((p) => p + 1)}
                  className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-text disabled:opacity-40"
                >
                  {t('products.pageNext')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {settingsProduct && (
        <ProductSettingsModal
          product={settingsProduct}
          onClose={() => setSettingsProduct(null)}
          onSaved={handleSettingsSaved}
        />
      )}
    </main>
  )
}
