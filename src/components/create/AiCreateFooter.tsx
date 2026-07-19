import { Link } from 'react-router-dom'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
} from '../../pages/create-program/wizardLayout'

type AiCreateFooterProps = {
  onConfig: () => void
  onBack: () => void
  onSubmit: () => void
  submitLabel: TranslationKey
  configIsCustom: boolean
  submitDisabled?: boolean
  submitting?: boolean
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function AiCreateFooter({
  onConfig,
  onBack,
  onSubmit,
  submitLabel,
  configIsCustom,
  submitDisabled = false,
  submitting = false,
  t,
}: AiCreateFooterProps) {
  return (
    <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
      <button
        type="button"
        onClick={onConfig}
        className={configIsCustom ? WIZARD_ACTION_PRIMARY : WIZARD_ACTION_SECONDARY}
      >
        {t('createAi.footer.config')}
      </button>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onBack} className={WIZARD_ACTION_SECONDARY}>
          {t('createAi.footer.back')}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled || submitting}
          className={`${WIZARD_ACTION_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {submitting ? t('createAi.footer.submitting') : t(submitLabel)}
        </button>
      </div>
    </div>
  )
}

export function AiCreateRefundNote({ t }: { t: (key: TranslationKey) => string }) {
  return (
    <p className="mt-4 rounded-xl border border-border bg-surface-card px-3 py-2 text-xs text-text-muted">
      {t('createAi.refundNote')}
    </p>
  )
}

function formatCreditsAmount(amount: number, uiLocale: string): string {
  const locale = uiLocale === 'vi' ? 'vi-VN' : uiLocale === 'ja' ? 'ja-JP' : 'en-US'
  return new Intl.NumberFormat(locale).format(amount)
}

/** Lỗi thiếu credit — đặt ngay dưới `AiCreateRefundNote`, kèm nút tới `/credits`. */
export function AiCreateInsufficientCreditsAlert({
  missingCredits,
  uiLocale,
  t,
}: {
  missingCredits: number
  uiLocale: string
  t: (key: TranslationKey, params?: MessageParams) => string
}) {
  return (
    <div
      role="alert"
      className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3"
    >
      <p className="min-w-0 flex-1 text-sm text-warning">
        {t('createAi.validation.insufficientCredits', {
          credits: formatCreditsAmount(missingCredits, uiLocale),
        })}
      </p>
      <Link
        to="/credits"
        className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-500/60 bg-amber-500 px-3.5 py-1.5 text-sm font-semibold text-zinc-950 no-underline shadow-sm transition hover:bg-amber-400 hover:shadow"
      >
        {t('createAi.validation.getCredits')}
      </Link>
    </div>
  )
}
