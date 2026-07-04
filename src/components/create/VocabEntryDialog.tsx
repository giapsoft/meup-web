import { useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { createProductRequest } from '../../api/productCreate'
import { cancelProductCreateManual } from '../../api/productCreateMedia'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { VocabItemDraft } from '../../types/program'
import type { ProgramConfigWeb } from '../../types/webConfig'
import { MANUAL_MIN_VOCAB_ITEMS, calculateManualMediaPrice } from '../../utils/pricing'
import { itemSchemaFromWebConfig } from '../../utils/programConfigWeb'
import { manualItemsMissingAnyMedia, toManualApiItems, validateManualVocabItems } from '../../utils/manualMedia'
import { createEmptyVocabItem } from '../../utils/vocabItems'
import { VocabEntryTable } from './VocabEntryTable'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
} from '../../pages/create-program/wizardLayout'

type VocabEntryDialogProps = {
  open: boolean
  title: string
  description: string
  programConfig: ProgramConfigWeb
  tempId: string
  nativeLang: string
  studyLang: string
  onClose: () => void
  onSuccess: (message: string) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function VocabEntryDialog({
  open,
  title,
  description,
  programConfig,
  tempId,
  nativeLang,
  studyLang,
  onClose,
  onSuccess,
  t,
}: VocabEntryDialogProps) {
  const schema = useMemo(() => itemSchemaFromWebConfig(programConfig), [programConfig])

  const [items, setItems] = useState<VocabItemDraft[]>(() =>
    Array.from({ length: MANUAL_MIN_VOCAB_ITEMS }, () => createEmptyVocabItem(schema)),
  )
  const [generateMediaForMissingItems, setGenerateMediaForMissingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const showGenerateCheckbox = useMemo(
    () => manualItemsMissingAnyMedia(items, schema),
    [items, schema],
  )

  const estimatedMediaCredits = useMemo(
    () =>
      calculateManualMediaPrice(
        items.map((item) => ({ values: item.values })),
        programConfig.itemSchema,
        generateMediaForMissingItems,
      ),
    [items, programConfig.itemSchema, generateMediaForMissingItems],
  )

  async function handleCancel() {
    if (!window.confirm(t('createManual.vocab.cancelConfirm'))) {
      return
    }
    try {
      await cancelProductCreateManual(tempId)
    } catch {
      // Best-effort cleanup
    }
    onClose()
  }

  async function handleSubmit() {
    const validation = validateManualVocabItems(items, schema)
    if (!validation.ok) {
      if (validation.reason === 'tooFew') {
        setErrorMessage(t('createManual.vocab.validation.tooFew', { min: MANUAL_MIN_VOCAB_ITEMS }))
      } else {
        setErrorMessage(t('createManual.vocab.validation.emptyItem'))
      }
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const created = await createProductRequest({
        type: 'manual',
        title: title.trim(),
        description: description.trim() || undefined,
        nativeLangId: nativeLang,
        studyLangId: studyLang,
        tempId,
        items: toManualApiItems(items),
        generateMediaForMissingItems,
        config: programConfig,
      })
      onSuccess(t('createAi.submitSuccess', { id: created.id, credits: created.totalCredits }))
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed'
      setErrorMessage(code)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/60"
          aria-label={t('createManual.vocab.close')}
          onClick={() => void handleCancel()}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface-raised shadow-xl sm:rounded-2xl"
        >
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-text">{t('createManual.vocab.title')}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {t('createManual.vocab.hint', { min: MANUAL_MIN_VOCAB_ITEMS })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <VocabEntryTable
              programName={title}
              schema={schema}
              items={items}
              onItemsChange={setItems}
              tempId={tempId}
              nativeLang={nativeLang}
              studyLang={studyLang}
              t={t}
              footer={
                <>
                  {showGenerateCheckbox && (
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-card px-3 py-3">
                      <input
                        type="checkbox"
                        checked={generateMediaForMissingItems}
                        onChange={(e) => setGenerateMediaForMissingItems(e.target.checked)}
                        className="mt-1 h-4 w-4 accent-accent"
                      />
                      <span className="text-sm text-text">
                        {t('createManual.vocab.generateMissing', { credits: estimatedMediaCredits })}
                      </span>
                    </label>
                  )}
                  {errorMessage && <p className="mt-3 text-sm text-warning">{errorMessage}</p>}
                </>
              }
            />
          </div>

          <div className={`${WIZARD_ACTIONS} border-t border-border px-4 py-3`}>
            <button type="button" onClick={() => void handleCancel()} className={WIZARD_ACTION_SECONDARY}>
              {t('createManual.vocab.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className={`${WIZARD_ACTION_PRIMARY} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? t('createAi.footer.submitting') : t('createManual.vocab.submit')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
