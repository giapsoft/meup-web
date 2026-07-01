import { useMemo, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, LevelRangeDraft, VocabItemDraft } from '../../types/program'
import { sideNumberLabel } from '../../utils/programConfig'
import {
  allProgramPreviewSides,
  buildConfigLevelItems,
  configLevelItemLabel,
} from '../../utils/levelConfig'
import {
  addVocabItem,
  removeVocabItem,
  textAttributes,
  updateVocabItemValue,
} from '../../utils/vocabItems'
import { itemMediaObjectUrls } from '../../utils/vocabMedia'
import { VocabCsvImportBar } from './VocabCsvImportBar'
import { SidePreview } from './SidePreview'
import { VocabMediaPanel } from './VocabMediaPanel'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_EDITOR_GRID,
  WIZARD_PREVIEW_COLUMN,
  WIZARD_STEP_SECTION,
} from './wizardLayout'

type VocabEntryStepProps = {
  programName: string
  schema: ItemSchema
  levels: LevelRangeDraft[]
  items: VocabItemDraft[]
  onItemsChange: (items: VocabItemDraft[]) => void
  onBack: () => void
  onContinue: () => void
  /** Override primary action label (default: continue). */
  continueLabelKey?: TranslationKey
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function VocabEntryStep({
  programName,
  schema,
  levels,
  items,
  onItemsChange,
  onBack,
  onContinue,
  continueLabelKey,
  t,
}: VocabEntryStepProps) {
  const textAttrs = useMemo(() => textAttributes(schema), [schema])
  const previewEntries = useMemo(() => allProgramPreviewSides(levels), [levels])
  const levelItems = useMemo(() => buildConfigLevelItems(levels), [levels])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id ?? null)
  const [previewSideIndex, setPreviewSideIndex] = useState(0)

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0]
  const previewEntry = previewEntries[previewSideIndex] ?? previewEntries[0]
  const previewSide = previewEntry?.side
  const canCycleFaces = previewEntries.length > 1
  const showLevelInPreview = levels.length > 1

  function previewFaceCaption(index: number): string {
    const entry = previewEntries[index]
    if (!entry) {
      return ''
    }
    const face = sideNumberLabel(entry.side.playOrder, t)
    const position = `${index + 1}/${previewEntries.length}`
    if (!showLevelInPreview) {
      return `${face} (${position})`
    }
    const levelItem = levelItems[entry.levelIndex]
    const levelLabel = levelItem ? configLevelItemLabel(levelItem, t) : ''
    return levelLabel ? `${levelLabel} · ${face} (${position})` : `${face} (${position})`
  }

  function showPrevFace() {
    setPreviewSideIndex((index) => (index - 1 + previewEntries.length) % previewEntries.length)
  }

  function showNextFace() {
    setPreviewSideIndex((index) => (index + 1) % previewEntries.length)
  }

  function selectItem(id: string) {
    setSelectedItemId(id)
  }

  function updateCell(itemId: string, key: string, value: string) {
    onItemsChange(updateVocabItemValue(items, itemId, key, value))
  }

  function handleAddRow() {
    const next = addVocabItem(items, schema)
    onItemsChange(next)
    setSelectedItemId(next[next.length - 1]?.id ?? null)
  }

  function handleRemoveRow(itemId: string) {
    const next = removeVocabItem(items, itemId)
    onItemsChange(next)
    if (selectedItemId === itemId) {
      setSelectedItemId(next[0]?.id ?? null)
    }
  }

  if (textAttrs.length === 0) {
    return (
      <section className={WIZARD_STEP_SECTION}>
        <h1 className="text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
          {t('createProgram.stepVocab.title')}
        </h1>
        <p className="mt-2 text-sm text-warning">{t('createProgram.stepVocab.noTextFields')}</p>
        <div className={WIZARD_ACTIONS}>
          <button type="button" onClick={onBack} className={WIZARD_ACTION_SECONDARY}>
            {t('createProgram.stepSchema.back')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={WIZARD_STEP_SECTION}>
      <h1 className="text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
        {t('createProgram.stepVocab.title')}
      </h1>
      <p className="mt-2 text-sm text-text-muted lg:text-base">{t('createProgram.stepVocab.hint')}</p>
      <p className="mt-1 text-xs text-text-muted lg:text-sm">{programName}</p>

      <div className={WIZARD_EDITOR_GRID}>
        <div className={`${WIZARD_PREVIEW_COLUMN} hidden lg:block`}>
          {previewSide && selectedItem ? (
            <div>
              <p className="mb-2 text-xs text-text-muted">{t('createProgram.stepVocab.previewHint')}</p>
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                {canCycleFaces && (
                  <button
                    type="button"
                    onClick={showPrevFace}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-text-muted hover:bg-surface-hover"
                    aria-label={t('createProgram.stepVocab.previewPrevFace')}
                  >
                    ‹
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <SidePreview
                    side={previewSide}
                    schema={schema}
                    itemValues={selectedItem.values}
                    itemMediaUrls={itemMediaObjectUrls(selectedItem)}
                    readOnly
                  />
                </div>
                {canCycleFaces && (
                  <button
                    type="button"
                    onClick={showNextFace}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-lg text-text-muted hover:bg-surface-hover"
                    aria-label={t('createProgram.stepVocab.previewNextFace')}
                  >
                    ›
                  </button>
                )}
              </div>
              {canCycleFaces && (
                <p className="mt-2 text-center text-xs text-text-muted">
                  {previewFaceCaption(previewSideIndex)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('createProgram.stepVocab.previewEmpty')}</p>
          )}
        </div>

        <div className="space-y-3 lg:mt-0">
          <VocabCsvImportBar
            programName={programName}
            schema={schema}
            items={items}
            onItemsChange={onItemsChange}
            onImported={setSelectedItemId}
            t={t}
          />

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-card text-left text-xs text-text-muted">
                  <th className="w-10 px-2 py-2 font-medium">#</th>
                  {textAttrs.map((attr) => (
                    <th key={attr.key} className="min-w-[120px] px-2 py-2 font-medium">
                      {attr.name}
                    </th>
                  ))}
                  <th className="w-12 px-2 py-2" aria-label={t('createProgram.stepVocab.removeRow')} />
                </tr>
              </thead>
              <tbody>
                {items.map((item, rowIndex) => {
                  const isSelected = item.id === selectedItem?.id
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border last:border-b-0 ${
                        isSelected ? 'bg-accent/10' : 'hover:bg-surface-hover/50'
                      }`}
                      onClick={() => selectItem(item.id)}
                    >
                      <td className="px-2 py-2 text-xs text-text-muted">{rowIndex + 1}</td>
                      {textAttrs.map((attr) => (
                        <td key={attr.key} className="px-2 py-1">
                          <input
                            type="text"
                            value={item.values[attr.key] ?? ''}
                            onChange={(e) => updateCell(item.id, attr.key, e.target.value)}
                            onFocus={() => selectItem(item.id)}
                            placeholder={attr.name}
                            className="w-full min-h-10 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveRow(item.id)
                          }}
                          className="rounded-lg px-2 py-1 text-red-400 hover:bg-red-500/10"
                          aria-label={t('createProgram.stepVocab.removeRow')}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-accent hover:border-accent"
          >
            + {t('createProgram.stepVocab.addRow')}
          </button>

          {selectedItem && (
            <VocabMediaPanel
              schema={schema}
              item={selectedItem}
              items={items}
              onItemsChange={onItemsChange}
              t={t}
            />
          )}

          <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
            <button type="button" onClick={onBack} className={WIZARD_ACTION_SECONDARY}>
              {t('createProgram.stepSchema.back')}
            </button>
            <button type="button" onClick={onContinue} className={WIZARD_ACTION_PRIMARY}>
              {t(continueLabelKey ?? 'createProgram.stepSchema.continue')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
