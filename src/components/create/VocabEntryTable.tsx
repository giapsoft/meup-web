import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, VocabItemDraft } from '../../types/program'
import {
  addVocabItem,
  removeVocabItem,
  textAttrs,
  updateVocabItemValue,
} from '../../utils/vocabItems'
import {
  attachServerMedia,
  getStagedMedia,
  mediaValueKey,
} from '../../utils/manualMedia'
import { mediaSlots, type MediaSlot } from '../../utils/itemSchemaLayout'
import { VocabCsvImportBar } from '../../pages/create-program/VocabCsvImportBar'
import { MediaPickerDialog } from './MediaPickerDialog'

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

function hasAttachedMedia(item: VocabItemDraft, valueKey: string): boolean {
  return Boolean(getStagedMedia(item, valueKey)) || Boolean(item.values[valueKey]?.trim())
}

export type VocabEntryTableProps = {
  programName: string
  schema: ItemSchema
  items: VocabItemDraft[]
  onItemsChange: (items: VocabItemDraft[]) => void
  tempId: string
  nativeLang: string
  studyLang: string
  t: (key: TranslationKey, params?: MessageParams) => string
  footer?: ReactNode
}

export function VocabEntryTable({
  programName,
  schema,
  items,
  onItemsChange,
  tempId,
  nativeLang,
  studyLang,
  t,
  footer,
}: VocabEntryTableProps) {
  const textFields = useMemo(() => textAttrs(schema), [schema])
  const mediaSlotList = useMemo(() => mediaSlots(schema), [schema])
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState | null>(null)

  function updateCell(itemId: string, key: string, value: string) {
    onItemsChange(updateVocabItemValue(items, itemId, key, value))
  }

  function handleAddRow() {
    onItemsChange(addVocabItem(items, schema))
  }

  function handleRemoveRow(itemId: string) {
    onItemsChange(removeVocabItem(items, itemId))
  }

  function openMediaPicker(item: VocabItemDraft, slot: MediaSlot) {
    const textKey = slot.textKey ?? slot.key
    const attr = schema.attrs.find((a) => a.key === textKey)
    const generateText = item.values[textKey]?.trim() || programName.trim()
    const generateLang = langForAttr(attr?.langType, nativeLang, studyLang)
    setMediaPicker({ itemId: item.id, slot, generateText, generateLang })
  }

  const pickerItem = mediaPicker ? items.find((i) => i.id === mediaPicker.itemId) : undefined
  const pickerValueKey = mediaPicker ? mediaValueKey(mediaPicker.slot) : ''
  const pickerStaged = pickerItem && pickerValueKey ? getStagedMedia(pickerItem, pickerValueKey) : undefined
  const pickerObjectKey = pickerStaged?.objectKey ?? (pickerItem ? pickerItem.values[pickerValueKey] : undefined)

  return (
    <>
      <VocabCsvImportBar
        programName={programName}
        schema={schema}
        items={items}
        onItemsChange={onItemsChange}
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
                        const hasMedia = hasAttachedMedia(item, valueKey)
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
                            {staged?.previewUrl && slot.kind === 'image' ? (
                              <img
                                src={staged.previewUrl}
                                alt=""
                                className="h-6 w-6 rounded object-cover"
                              />
                            ) : hasMedia && slot.kind === 'audio' ? (
                              '♪'
                            ) : hasMedia && slot.kind === 'image' ? (
                              '🖼'
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

      {footer}

      {mediaPicker && pickerItem && (
        <MediaPickerDialog
          open
          slot={mediaPicker.slot}
          tempId={tempId}
          currentObjectKey={pickerObjectKey}
          currentPreviewUrl={pickerStaged?.previewUrl}
          generateText={mediaPicker.generateText}
          generateLang={mediaPicker.generateLang}
          onClose={() => setMediaPicker(null)}
          onApply={(result) => {
            onItemsChange(attachServerMedia(items, mediaPicker.itemId, pickerValueKey, result))
            setMediaPicker(null)
          }}
          t={t}
        />
      )}
    </>
  )
}
