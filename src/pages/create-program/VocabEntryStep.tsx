import { useMemo, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaAttribute, LevelRangeDraft, SideDraft, VocabItemDraft } from '../../types/program'
import { sideNumberLabel } from '../../utils/programConfig'
import {
  addVocabItem,
  removeVocabItem,
  textAttributes,
  updateVocabItemValue,
} from '../../utils/vocabItems'
import { SidePreview } from './SidePreview'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_EDITOR_GRID,
  WIZARD_FORM_COLUMN,
  WIZARD_PREVIEW_COLUMN,
  WIZARD_STEP_SECTION,
} from './wizardLayout'

type VocabEntryStepProps = {
  programName: string
  attributes: ItemSchemaAttribute[]
  levels: LevelRangeDraft[]
  items: VocabItemDraft[]
  onItemsChange: (items: VocabItemDraft[]) => void
  onBack: () => void
  onContinue: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function previewSides(levels: LevelRangeDraft[]): SideDraft[] {
  const level = levels[0]
  if (!level) {
    return []
  }
  return [...level.sides].sort((a, b) => a.playOrder - b.playOrder)
}

export function VocabEntryStep({
  programName,
  attributes,
  levels,
  items,
  onItemsChange,
  onBack,
  onContinue,
  t,
}: VocabEntryStepProps) {
  const textAttrs = useMemo(() => textAttributes(attributes), [attributes])
  const sides = useMemo(() => previewSides(levels), [levels])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(items[0]?.id ?? null)
  const [previewSideIndex, setPreviewSideIndex] = useState(0)

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0]
  const previewSide = sides[previewSideIndex] ?? sides[0]

  function selectItem(id: string) {
    setSelectedItemId(id)
  }

  function updateCell(itemId: string, key: string, value: string) {
    onItemsChange(updateVocabItemValue(items, itemId, key, value))
  }

  function handleAddRow() {
    const next = addVocabItem(items, attributes)
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
        <p className="mt-2 text-sm text-amber-300">{t('createProgram.stepVocab.noTextFields')}</p>
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
        <div className={WIZARD_PREVIEW_COLUMN}>
          {sides.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {sides.map((side, index) => (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => setPreviewSideIndex(index)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    index === previewSideIndex
                      ? 'bg-accent text-surface'
                      : 'border border-border text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {sideNumberLabel(side.playOrder, t)}
                </button>
              ))}
            </div>
          )}
          {previewSide && selectedItem ? (
            <SidePreview
              side={previewSide}
              attributes={attributes}
              itemValues={selectedItem.values}
              readOnly
              hint={t('createProgram.stepVocab.previewHint')}
            />
          ) : (
            <p className="text-sm text-text-muted">{t('createProgram.stepVocab.previewEmpty')}</p>
          )}
        </div>

        <div className={WIZARD_FORM_COLUMN}>
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

          <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
            <button type="button" onClick={onBack} className={WIZARD_ACTION_SECONDARY}>
              {t('createProgram.stepSchema.back')}
            </button>
            <button type="button" onClick={onContinue} className={WIZARD_ACTION_PRIMARY}>
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
