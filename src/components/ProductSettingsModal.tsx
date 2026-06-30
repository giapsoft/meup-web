import { useEffect, useId, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import {
  patchProductSettings,
  type OwnedProductDto,
  type ProductSettingsDto,
} from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

type ProductSettingsModalProps = {
  product: OwnedProductDto
  onClose: () => void
  onSaved: (updated: ProductSettingsDto) => void
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_request: 'products.settings.error.invalid_request',
  product_not_found: 'products.settings.error.product_not_found',
  forbidden: 'products.settings.error.forbidden',
}

export function ProductSettingsModal({ product, onClose, onSaved }: ProductSettingsModalProps) {
  const { t } = useLanguagePair()
  const titleId = useId()
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description)
  const [shareMode, setShareMode] = useState<'public' | 'private'>(
    product.shareMode === 'public' ? 'public' : 'private',
  )
  const [creditPriceInput, setCreditPriceInput] = useState(String(product.creditPrice))
  const [nameError, setNameError] = useState('')
  const [priceError, setPriceError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, saving])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError(t('products.settings.validation.nameRequired'))
      return
    }
    setNameError('')

    const creditPrice = Number.parseInt(creditPriceInput.trim(), 10)
    if (!Number.isFinite(creditPrice) || creditPrice < 0) {
      setPriceError(t('products.settings.validation.creditPriceInvalid'))
      return
    }
    setPriceError('')

    setSaving(true)
    try {
      const updated = await patchProductSettings({
        productId: product.productId,
        name: trimmedName,
        description: description.trim(),
        shareMode,
        creditPrice,
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'generic'
      const key = ERROR_KEYS[code]
      setSubmitError(key ? t(key) : t('products.settings.error.generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!saving) {
            onClose()
          }
        }}
        aria-label={t('products.settings.cancel')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 shadow-xl sm:rounded-2xl sm:p-5"
      >
        <h2 id={titleId} className="text-lg font-semibold text-text">
          {t('products.settings.title')}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{t('products.settings.subtitle')}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-text">{t('products.settings.nameLabel')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-text disabled:opacity-60"
            />
            {nameError ? <p className="mt-1 text-xs text-warning">{nameError}</p> : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-text">
              {t('products.settings.descriptionLabel')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-text disabled:opacity-60"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text">{t('products.settings.shareModeLabel')}</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="shareMode"
                value="private"
                checked={shareMode === 'private'}
                onChange={() => setShareMode('private')}
                disabled={saving}
              />
              {t('products.shareMode.private')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="shareMode"
                value="public"
                checked={shareMode === 'public'}
                onChange={() => setShareMode('public')}
                disabled={saving}
              />
              {t('products.shareMode.public')}
            </label>
            <p className="text-xs text-text-muted">{t('products.settings.shareModeHint')}</p>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium text-text">{t('products.creditPrice')}</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={creditPriceInput}
              onChange={(e) => setCreditPriceInput(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm tabular-nums text-text disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-text-muted">{t('products.settings.creditPriceHint')}</p>
            {priceError ? <p className="mt-1 text-xs text-warning">{priceError}</p> : null}
          </label>

          {submitError ? (
            <p className="rounded-lg border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-border bg-surface-card px-4 py-2 text-sm font-medium text-text transition hover:bg-surface-hover disabled:opacity-60"
            >
              {t('products.settings.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-accent/40 bg-accent-soft px-4 py-2 text-sm font-medium text-accent transition hover:border-accent hover:bg-accent/20 disabled:opacity-60"
            >
              {saving ? t('products.settings.saving') : t('products.settings.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
