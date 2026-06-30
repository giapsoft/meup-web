import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import {
  listProductCatalog,
  purchaseProduct,
  type CatalogProductDto,
} from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { useAccount } from '../context/AccountProvider'
import type { TranslationKey } from '../i18n/types'
import { userCanUseCatalogProduct } from '../utils/catalogProductAccess'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

const PURCHASE_ERROR_KEYS: Record<string, TranslationKey> = {
  insufficient_credits: 'explore.purchase.error.insufficient_credits',
  already_purchased: 'explore.purchase.error.already_purchased',
  already_has_access: 'explore.purchase.error.already_has_access',
  cannot_purchase_own_product: 'explore.purchase.error.cannot_purchase_own_product',
  product_not_found: 'explore.purchase.error.product_not_found',
}

function purchaseErrorMessage(t: (key: TranslationKey) => string, err: unknown): string {
  if (err instanceof ApiError && PURCHASE_ERROR_KEYS[err.code]) {
    return t(PURCHASE_ERROR_KEYS[err.code])
  }
  return t('explore.purchase.error.generic')
}

type CatalogCardProps = {
  product: CatalogProductDto
  purchasing: boolean
  purchaseError: string | null
  onPurchase: (productId: string) => void
}

function CatalogCard({ product, purchasing, purchaseError, onPurchase }: CatalogCardProps) {
  const { t } = useLanguagePair()
  const canUse = userCanUseCatalogProduct(product)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{product.name}</h3>
        {canUse && (
          <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted">
            {t('explore.badge.canUse')}
          </span>
        )}
      </div>
      {product.description ? (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{product.description}</p>
      ) : null}
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <div>
          <dt className="inline">{t('products.creditPrice')}: </dt>
          <dd className="inline tabular-nums">{product.creditPrice}</dd>
        </div>
        <div>
          <dt className="inline">{t('explore.vocabCount')}: </dt>
          <dd className="inline tabular-nums">{product.vocabCount}</dd>
        </div>
      </dl>
      {!canUse && (
        <div className="mt-4">
          <button
            type="button"
            disabled={purchasing}
            onClick={() => onPurchase(product.productId)}
            className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {purchasing ? t('explore.purchase.busy') : t('explore.purchase.submit')}
          </button>
          {purchaseError ? (
            <p role="alert" className="mt-2 text-xs text-warning">
              {purchaseError}
            </p>
          ) : null}
        </div>
      )}
    </article>
  )
}

export function ExplorePage() {
  const { t, nativeLang, studyLang, langPair } = useLanguagePair()
  const { refreshAccount } = useAccount()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [products, setProducts] = useState<CatalogProductDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [purchaseErrors, setPurchaseErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoadState({ phase: 'loading' })
    try {
      const res = await listProductCatalog({
        nativeLang,
        studyLang,
        page,
        limit: 20,
      })
      setProducts(res.products)
      setTotalPages(Math.max(1, res.pagination.totalPages))
      setLoadState({ phase: 'ready' })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? t('explore.errorCode', { code: err.code })
          : t('explore.errorGeneric')
      setLoadState({ phase: 'error', message })
    }
  }, [nativeLang, studyLang, page, t])

  const handlePurchase = useCallback(
    async (productId: string) => {
      if (purchasingId) {
        return
      }
      setPurchasingId(productId)
      setPurchaseErrors((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
      try {
        await purchaseProduct(productId)
        setProducts((prev) =>
          prev.map((p) => (p.productId === productId ? { ...p, isPurchased: true } : p)),
        )
        await refreshAccount()
      } catch (err) {
        setPurchaseErrors((prev) => ({
          ...prev,
          [productId]: purchaseErrorMessage(t, err),
        }))
      } finally {
        setPurchasingId(null)
      }
    },
    [purchasingId, t, refreshAccount],
  )

  useEffect(() => {
    setPage(1)
  }, [nativeLang, studyLang])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {t('products.explore.title')}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">{t('products.explore.description')}</p>
      <p className="mt-3 text-sm text-text-muted">
        {t('explore.filterPair', { pair: langPair })}
      </p>

      <section className="mt-6" aria-live="polite">
        {loadState.phase === 'loading' && (
          <p className="text-sm text-text-muted">{t('explore.loading')}</p>
        )}
        {loadState.phase === 'error' && (
          <div className="rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
            {loadState.message}
            <button type="button" onClick={() => void load()} className="ml-3 font-medium underline">
              {t('explore.retryLoad')}
            </button>
          </div>
        )}
        {loadState.phase === 'ready' &&
          (products.length === 0 ? (
            <p className="text-sm text-text-muted">{t('explore.empty')}</p>
          ) : (
            <>
              <ul className="grid gap-3 sm:gap-4">
                {products.map((product) => (
                  <li key={product.productId}>
                    <CatalogCard
                      product={product}
                      purchasing={purchasingId === product.productId}
                      purchaseError={purchaseErrors[product.productId] ?? null}
                      onPurchase={(id) => void handlePurchase(id)}
                    />
                  </li>
                ))}
              </ul>
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
          ))}
      </section>
    </main>
  )
}
