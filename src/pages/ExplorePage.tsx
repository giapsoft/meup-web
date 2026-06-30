import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { listProductCatalog, type CatalogProductDto } from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready' }
  | { phase: 'error'; message: string }

function accessBadges(product: CatalogProductDto): TranslationKey[] {
  const keys: TranslationKey[] = []
  if (product.isOwner) {
    keys.push('explore.badge.owned')
  }
  if (product.isPurchased) {
    keys.push('explore.badge.purchased')
  }
  if (product.isShared) {
    keys.push('explore.badge.shared')
  }
  return keys
}

function CatalogCard({ product }: { product: CatalogProductDto }) {
  const { t } = useLanguagePair()
  const badges = accessBadges(product)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{product.name}</h3>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((key) => (
              <span
                key={key}
                className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs font-medium text-text-muted"
              >
                {t(key)}
              </span>
            ))}
          </div>
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
    </article>
  )
}

export function ExplorePage() {
  const { t, nativeLang, studyLang, langPair } = useLanguagePair()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [products, setProducts] = useState<CatalogProductDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

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
                    <CatalogCard product={product} />
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
