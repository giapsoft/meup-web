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
