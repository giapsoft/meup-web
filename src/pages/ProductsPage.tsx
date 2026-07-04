import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getAccount } from '../api/emailAuth'
import {
  getDevicePrograms,
  listOwnedProducts,
  listProductCreateRequests,
  listPurchasedProducts,
  type OwnedProductDto,
  type ProductCreateRequestSummaryDto,
  type ProductSettingsDto,
  type PurchasedProductDto,
} from '../api/product'
import { getProductCreateProgress, type ProductCreateProgressDto } from '../api/productCreate'
import { ProductSettingsModal } from '../components/ProductSettingsModal'
import { ProductShareModal } from '../components/ProductShareModal'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'
import {
  sharedProductsForLangPair,
  type DeviceProgramProductDto,
} from '../utils/deviceProgramsCompact'

type Tab = 'owned' | 'purchased' | 'shared' | 'requests'

const REFRESH_COOLDOWN_MS = 5000

const TAB_LABEL_KEYS: Record<Tab, TranslationKey> = {
  owned: 'products.tabOwned',
  purchased: 'products.tabPurchased',
  shared: 'products.tabShared',
  requests: 'products.tabRequests',
}

const FILTER_PAIR_KEYS: Record<Tab, TranslationKey> = {
  owned: 'products.filterPair',
  purchased: 'products.filterPairPurchased',
  shared: 'products.filterPairShared',
  requests: 'products.filterPairRequests',
}

const REQUEST_STATUS_KEYS: Record<string, TranslationKey> = {
  pending: 'products.status.pending',
  working: 'products.status.working',
  success: 'products.status.success',
  failed: 'products.status.failed',
}

const REQUEST_TYPE_KEYS: Record<string, TranslationKey> = {
  manual: 'createRequests.type.manual',
  title: 'createRequests.type.title',
  image: 'createRequests.type.image',
  paragraph: 'createRequests.type.paragraph',
}

const SHARE_MODE_KEYS: Record<string, TranslationKey> = {
  public: 'products.shareMode.public',
  private: 'products.shareMode.private',
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

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

function isActiveCreateRequest(status: string): boolean {
  return status === 'pending' || status === 'working'
}

function requestTitle(request: ProductCreateRequestSummaryDto): string {
  return request.title?.trim() || request.productName?.trim() || request.id
}

function requestDescription(request: ProductCreateRequestSummaryDto): string {
  return request.description?.trim() || request.productDescription?.trim() || ''
}

function ProgressPanel({ progress }: { progress: ProductCreateProgressDto }) {
  const { t } = useLanguagePair()

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm">
      {progress.progressPercent != null ? (
        <p className="font-medium text-text">
          {t('createRequests.progressPercent', { percent: progress.progressPercent })}
        </p>
      ) : progress.jobs ? (
        <ul className="space-y-0.5 text-xs text-text-muted">
          <li>{t('createRequests.jobsSuccess', { count: progress.jobs.success })}</li>
          <li>{t('createRequests.jobsWorking', { count: progress.jobs.working })}</li>
          <li>{t('createRequests.jobsPending', { count: progress.jobs.pending })}</li>
          {progress.jobs.failed > 0 && (
            <li className="text-warning">
              {t('createRequests.jobsFailed', { count: progress.jobs.failed })}
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
  onOpenShare,
}: {
  product: OwnedProductDto
  locale: string
  onOpenSettings: () => void
  onOpenShare: () => void
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
          <Link
            to={`/products/${product.productId}/edit`}
            state={{ product }}
            className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-1 text-xs font-medium text-accent no-underline transition hover:border-accent hover:bg-accent/20"
          >
            {t('products.edit.open')}
          </Link>
          <button
            type="button"
            onClick={onOpenShare}
            className="rounded-lg border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover"
          >
            {t('products.share.open')}
          </button>
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
        <div className="sm:col-span-2">
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function SharedProductCard({ product }: { product: DeviceProgramProductDto }) {
  const { t } = useLanguagePair()

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{product.name}</h3>
        <span className="rounded-md border border-accent/40 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          {t('products.shared.badge')}
        </span>
      </div>
      {product.description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{product.description}</p>
      ) : null}
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div>
          <dt className="inline">{t('products.shared.packageSize')}: </dt>
          <dd className="inline tabular-nums">{formatBytes(product.totalSize)}</dd>
        </div>
        <div>
          <dt className="inline">{t('products.shared.fileCount')}: </dt>
          <dd className="inline tabular-nums">{product.files.length}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-text-muted">{t('products.shared.hint')}</p>
    </article>
  )
}

function PurchasedProductCard({ product, locale }: { product: PurchasedProductDto; locale: string }) {
  const { t } = useLanguagePair()

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <h3 className="text-base font-semibold text-text">{product.name}</h3>
      {product.description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{product.description}</p>
      ) : null}
      <dl className="mt-3 grid gap-1 text-xs text-text-muted sm:grid-cols-2">
        <div>
          <dt className="inline">{t('products.purchasedCredits')}: </dt>
          <dd className="inline tabular-nums">{product.creditAmount}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline">{t('products.purchasedAt')}: </dt>
          <dd className="inline">{formatWhen(product.purchasedAt, locale)}</dd>
        </div>
      </dl>
      <Link
        to="/explore"
        className="mt-3 inline-flex text-sm font-medium text-accent no-underline transition hover:underline"
      >
        {t('products.viewOnExplore')}
      </Link>
    </article>
  )
}

function CreateRequestCard({
  request,
  locale,
  progress,
}: {
  request: ProductCreateRequestSummaryDto
  locale: string
  progress?: ProductCreateProgressDto
}) {
  const { t } = useLanguagePair()
  const statusKey = REQUEST_STATUS_KEYS[request.status]
  const typeKey = request.type ? REQUEST_TYPE_KEYS[request.type] : undefined
  const description = requestDescription(request)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{requestTitle(request)}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {typeKey && (
            <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">
              {t(typeKey)}
            </span>
          )}
          <span
            className={[
              'rounded-md border px-2 py-0.5 text-xs font-medium',
              statusBadgeClass(request.status),
            ].join(' ')}
          >
            {statusKey ? t(statusKey) : request.status}
          </span>
        </div>
      </div>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
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
      {progress && <ProgressPanel progress={progress} />}
    </article>
  )
}

function CreateRequestsTab({
  requests,
  requestPage,
  requestTotalPages,
  progressById,
  refreshing,
  toastMessage,
  onRefresh,
  onPageChange,
}: {
  requests: ProductCreateRequestSummaryDto[]
  requestPage: number
  requestTotalPages: number
  progressById: Record<string, ProductCreateProgressDto>
  refreshing: boolean
  toastMessage: string | null
  onRefresh: () => void
  onPageChange: (page: number) => void
}) {
  const { t, uiLocale } = useLanguagePair()
  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-muted">{t('createRequests.hint')}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover"
        >
          {refreshing ? t('createRequests.refreshing') : t('createRequests.refresh')}
        </button>
      </div>

      {toastMessage && (
        <div className="mb-4 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-muted">
          {toastMessage}
        </div>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-text-muted">{t('products.emptyRequests')}</p>
      ) : (
        <ul className="grid gap-3 sm:gap-4">
          {requests.map((request) => (
            <li key={request.id}>
              <CreateRequestCard
                request={request}
                locale={locale}
                progress={progressById[request.id]}
              />
            </li>
          ))}
        </ul>
      )}

      {requestTotalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={requestPage <= 1}
            onClick={() => onPageChange(Math.max(1, requestPage - 1))}
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
            onClick={() => onPageChange(requestPage + 1)}
            className="rounded-lg border border-border bg-surface-card px-3 py-1.5 font-medium text-text disabled:opacity-40"
          >
            {t('products.pageNext')}
          </button>
        </div>
      )}
    </>
  )
}

export function ProductsPage() {
  const { t, uiLocale, nativeLang, studyLang, langPair } = useLanguagePair()
  const [tab, setTab] = useState<Tab>('owned')
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [owned, setOwned] = useState<OwnedProductDto[]>([])
  const [purchased, setPurchased] = useState<PurchasedProductDto[]>([])
  const [shared, setShared] = useState<DeviceProgramProductDto[]>([])
  const [requests, setRequests] = useState<ProductCreateRequestSummaryDto[]>([])
  const [requestPage, setRequestPage] = useState(1)
  const [requestTotalPages, setRequestTotalPages] = useState(1)
  const [progressById, setProgressById] = useState<Record<string, ProductCreateProgressDto>>({})
  const [requestsRefreshing, setRequestsRefreshing] = useState(false)
  const [requestsToast, setRequestsToast] = useState<string | null>(null)
  const [settingsProduct, setSettingsProduct] = useState<OwnedProductDto | null>(null)
  const [shareProductState, setShareProductState] = useState<OwnedProductDto | null>(null)
  const langPairKey = `${nativeLang}_${studyLang}`
  const prevLangPairRef = useRef(langPairKey)
  const lastRequestsRefreshAtRef = useRef(0)

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

  const loadRequestsList = useCallback(async () => {
    const res = await listProductCreateRequests({
      nativeLang,
      studyLang,
      page: requestPage,
      limit: 20,
    })
    setRequests(res.requests)
    setRequestTotalPages(Math.max(1, res.pagination.totalPages))
    return res.requests
  }, [nativeLang, studyLang, requestPage])

  const fetchProgressForActive = useCallback(async (list: ProductCreateRequestSummaryDto[]) => {
    const active = list.filter((r) => isActiveCreateRequest(r.status))
    if (active.length === 0) {
      return
    }
    const results = await Promise.allSettled(
      active.map((r) => getProductCreateProgress(r.id)),
    )
    setProgressById((prev) => {
      const next = { ...prev }
      active.forEach((r, index) => {
        const result = results[index]
        if (result.status === 'fulfilled') {
          next[r.id] = result.value
        }
      })
      return next
    })
  }, [])

  const refreshCreateRequests = useCallback(async () => {
    const elapsed = Date.now() - lastRequestsRefreshAtRef.current
    if (lastRequestsRefreshAtRef.current > 0 && elapsed < REFRESH_COOLDOWN_MS) {
      setRequestsToast(
        t('createRequests.refreshTooSoon', {
          seconds: Math.ceil((REFRESH_COOLDOWN_MS - elapsed) / 1000),
        }),
      )
      return
    }
    lastRequestsRefreshAtRef.current = Date.now()
    setRequestsRefreshing(true)
    setRequestsToast(null)
    try {
      const list = await loadRequestsList()
      await fetchProgressForActive(list)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('products.errorCode', { code: err.code })
          : t('products.errorGeneric')
      setRequestsToast(message)
    } finally {
      setRequestsRefreshing(false)
    }
  }, [fetchProgressForActive, loadRequestsList, t])

  const load = useCallback(async () => {
    setLoadState({ phase: 'loading' })
    try {
      const account = await getAccount()
      if (tab === 'owned') {
        const res = await listOwnedProducts(account.userId, { nativeLang, studyLang })
        setOwned(res.products)
      } else if (tab === 'purchased') {
        const res = await listPurchasedProducts(account.userId, { nativeLang, studyLang })
        setPurchased(res.products)
      } else if (tab === 'shared') {
        const programs = await getDevicePrograms()
        setShared(sharedProductsForLangPair(programs, langPair))
      } else {
        await loadRequestsList()
        setProgressById({})
        lastRequestsRefreshAtRef.current = 0
      }
      setLoadState({ phase: 'ready' })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('products.errorCode', { code: err.code })
          : t('products.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [tab, nativeLang, studyLang, langPair, t, loadRequestsList])

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

  useEffect(() => {
    if (!requestsToast) {
      return
    }
    const timer = window.setTimeout(() => setRequestsToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [requestsToast])

  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {t('products.my.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">{t('products.my.description')}</p>
          <p className="mt-1 text-xs text-text-muted">{t(FILTER_PAIR_KEYS[tab], { pair: langPair })}</p>
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
        {(['owned', 'purchased', 'shared', 'requests'] as const).map((key) => (
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
                    onOpenShare={() => setShareProductState(product)}
                  />
                </li>
              ))}
            </ul>
          )
        )}
        {loadState.phase === 'ready' && tab === 'purchased' && (
          purchased.length === 0 ? (
            <p className="text-sm text-text-muted">{t('products.emptyPurchased')}</p>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {purchased.map((product) => (
                <li key={product.transactionId}>
                  <PurchasedProductCard product={product} locale={locale} />
                </li>
              ))}
            </ul>
          )
        )}
        {loadState.phase === 'ready' && tab === 'shared' && (
          shared.length === 0 ? (
            <p className="text-sm text-text-muted">{t('products.emptyShared')}</p>
          ) : (
            <ul className="grid gap-3 sm:gap-4">
              {shared.map((product) => (
                <li key={product.id}>
                  <SharedProductCard product={product} />
                </li>
              ))}
            </ul>
          )
        )}
        {loadState.phase === 'ready' && tab === 'requests' && (
          <CreateRequestsTab
            requests={requests}
            requestPage={requestPage}
            requestTotalPages={requestTotalPages}
            progressById={progressById}
            refreshing={requestsRefreshing}
            toastMessage={requestsToast}
            onRefresh={() => void refreshCreateRequests()}
            onPageChange={setRequestPage}
          />
        )}
      </section>

      {settingsProduct && (
        <ProductSettingsModal
          product={settingsProduct}
          onClose={() => setSettingsProduct(null)}
          onSaved={handleSettingsSaved}
        />
      )}

      {shareProductState && (
        <ProductShareModal
          product={shareProductState}
          onClose={() => setShareProductState(null)}
        />
      )}
    </main>
  )
}
