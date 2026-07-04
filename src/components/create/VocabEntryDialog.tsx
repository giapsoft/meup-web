import { useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { createProductRequest } from '../../api/productCreate'
import { cancelProductCreateManual } from '../../api/productCreateMedia'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, VocabItemDraft } from '../../types/program'
import type { ProgramConfigWeb } from '../../types/webConfig'
import { MANUAL_MIN_VOCAB_ITEMS, calculateManualMediaPrice } from '../../utils/pricing'
import {
  addVocabItem,
  createEmptyVocabItem,
  removeVocabItem,
  textAttrs,
  updateVocabItemValue,
} from '../../utils/vocabItems'
import {
  attachServerMedia,
  getStagedMedia,
  manualItemsMissingAnyMedia,
  mediaValueKey,
  toManualApiItems,
  validateManualVocabItems,
} from '../../utils/manualMedia'
import { mediaSlots, type MediaSlot } from '../../utils/itemSchemaLayout'
import { VocabCsvImportBar } from '../../pages/create-program/VocabCsvImportBar'
import { MediaPickerDialog } from './MediaPickerDialog'
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
  schema: ItemSchema
  tempId: string
  nativeLang: string
  studyLang: string
  onClose: () => void
  onSuccess: (message: string) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

type MediaPickerState = {
  itemId: string
  slot: MediaSlot
  generateText: string
  generateLang: string
}

function langForAttr(
  attrLang: string | undefined,
  nativeLang: string,
  studyLang: string,
): string {
  if (attrLang === 'native') {
    return nativeLang
  }
  return studyLang
}

export function VocabEntryDialog({
  open,
  title,
  description,
  programConfig,
  schema,
  tempId,
  nativeLang,
  studyLang,
  onClose,
  onSuccess,
  t,
}: VocabEntryDialogProps) {
  const textFields = useMemo(() => textAttrs(schema), [schema])
  const mediaSlotList = useMemo(() => mediaSlots(schema), [schema])

  const [items, setItems] = useState<VocabItemDraft[]>(() =>
    Array.from({ length: MANUAL_MIN_VOCAB_ITEMS }, () => createEmptyVocabItem(schema)),
  )
  const [generateMediaForMissingItems, setGenerateMediaForMissingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null)

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

  function updateCell(itemId: string, key: string, value: string) {
    setItems((prev) => updateVocabItemValue(prev, itemId, key, value))
  }

  function handleAddRow() {
    setItems((prev) => addVocabItem(prev, schema))
  }

  function handleRemoveRow(itemId: string) {
    setItems((prev) => removeVocabItem(prev, itemId))
  }

  function openMediaPicker(item: VocabItemDraft, slot: MediaSlot) {
    const textKey = slot.textKey ?? slot.key
    const attr = schema.attrs.find((a) => a.key === textKey)
    const generateText = item.values[textKey]?.trim() || title.trim()
    const generateLang = langForAttr(attr?.langType, nativeLang, studyLang)
    setMediaPicker({ itemId: item.id, slot, generateText, generateLang })
  }

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

  const pickerItem = mediaPicker ? items.find((i) => i.id === mediaPicker.itemId) : undefined
  const pickerValueKey = mediaPicker ? mediaValueKey(mediaPicker.slot) : ''
  const pickerStaged = pickerItem && pickerValueKey ? getStagedMedia(pickerItem, pickerValueKey) : undefined

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
            <VocabCsvImportBar
              programName={title}
              schema={schema}
              items={items}
              onItemsChange={setItems}
              onImported={() => {}}
              t={t}
            />

            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-card text-left text-xs text-text-muted">
                    <th className="w-10 px-2 py-2 font-medium">#</th>
                    {textFields.map((attr) => (
                      <th key={attr.key} className="min-w-[100px] px-2 py-2 font-medium">
                        {attr.name}
                      </th>
                    ))}
                    {mediaSlotList.length > 0 && (
                      <th className="min-w-[80px] px-2 py-2 font-medium">
                        {t('createManual.vocab.mediaColumn')}
                      </th>
                    )}
                    <th className="w-12 px-2 py-2" aria-label={t('createProgram.stepVocab.removeRow')} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, rowIndex) => (
                    <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover/40">
                      <td className="px-2 py-2 text-xs text-text-muted">{rowIndex + 1}</td>
                      {textFields.map((attr) => (
                        <td key={attr.key} className="px-2 py-1">
                          <input
                            type="text"
                            value={item.values[attr.key] ?? ''}
                            onChange={(e) => updateCell(item.id, attr.key, e.target.value)}
                            placeholder={attr.name}
                            className="w-full min-h-10 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                          />
                        </td>
                      ))}
                      {mediaSlotList.length > 0 && (
                        <td className="px-2 py-1">
                          <div className="flex flex-wrap gap-1">
                            {mediaSlotList.map((slot) => {
                              const valueKey = mediaValueKey(slot)
                              const staged = getStagedMedia(item, valueKey)
                              const hasMedia = Boolean(staged)
                              return (
                                <button
                                  key={valueKey}
                                  type="button"
                                  onClick={() => openMediaPicker(item, slot)}
                                  className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs ${
                                    hasMedia
                                      ? 'border-accent bg-accent-soft text-accent'
                                      : 'border-border text-text-muted hover:border-accent hover:text-accent'
                                  }`}
                                  aria-label={
                                    slot.kind === 'image'
                                      ? t('createManual.vocab.addImage')
                                      : t('createManual.vocab.addAudio')
                                  }
                                  title={
                                    slot.kind === 'image'
                                      ? t('createManual.vocab.addImage')
                                      : t('createManual.vocab.addAudio')
                                  }
                                >
                                  {hasMedia && slot.kind === 'image' && staged ? (
                                    <img
                                      src={staged.previewUrl}
                                      alt=""
                                      className="h-6 w-6 rounded object-cover"
                                    />
                                  ) : hasMedia && slot.kind === 'audio' ? (
                                    '♪'
                                  ) : slot.kind === 'image' ? (
                                    '+🖼'
                                  ) : (
                                    '+♪'
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(item.id)}
                          className="rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10"
                          aria-label={t('createProgram.stepVocab.removeRow')}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="mt-3 w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-accent hover:border-accent"
            >
              + {t('createProgram.stepVocab.addRow')}
            </button>

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

      {mediaPicker && pickerItem && (
        <MediaPickerDialog
          open
          slot={mediaPicker.slot}
          tempId={tempId}
          currentObjectKey={pickerStaged?.objectKey}
          currentPreviewUrl={pickerStaged?.previewUrl}
          generateText={mediaPicker.generateText}
          generateLang={mediaPicker.generateLang}
          onClose={() => setMediaPicker(null)}
          onApply={(result) => {
            setItems((prev) => attachServerMedia(prev, mediaPicker.itemId, pickerValueKey, result))
            setMediaPicker(null)
          }}
          t={t}
        />
      )}
    </>
  )
}
