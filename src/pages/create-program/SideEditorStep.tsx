import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaAttribute, SideDraft } from '../../types/program'
import {
  addDisplayElement,
  addPauseStep,
  addPlayStep,
  attributeLabel,
  audioAttributeIndexes,
  displayableAttributeIndexes,
  updateDisplayElement,
} from '../../utils/sideConfig'
import { defaultPaletteColor, displayColorOr } from '../../utils/colorPalette'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import { sideNumberLabel } from '../../utils/programConfig'
import { ColorPickerField } from './ColorPickerField'
import { DisplayElementEditorPanel } from './DisplayElementEditorPanel'
import { PlayStepEditor } from './PlayStepEditor'
import { SidePreview } from './SidePreview'
import { previewDragHintKey, previewTapHintKey } from './previewHints'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTIONS,
  WIZARD_EDITOR_GRID,
  WIZARD_FORM_COLUMN,
  WIZARD_PREVIEW_COLUMN,
  WIZARD_STEP_SECTION,
} from './wizardLayout'

type SideEditorStepProps = {
  programName: string
  side: SideDraft
  attributes: ItemSchemaAttribute[]
  editingDisplayIndex?: number | null
  onChange: (side: SideDraft) => void
  onEditDisplay: (displayIndex: number) => void
  onCloseDisplayEdit?: () => void
  onBack: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function SideEditorStep({
  programName,
  side,
  attributes,
  editingDisplayIndex = null,
  onChange,
  onEditDisplay,
  onCloseDisplayEdit,
  onBack,
  t,
}: SideEditorStepProps) {
  const isWideLayout = useWizardWideLayout()
  const hasAudio = audioAttributeIndexes(attributes).length > 0
  const displayIndexes = displayableAttributeIndexes(attributes)
  const bgColor = displayColorOr(side.backgroundColor, defaultPaletteColor())

  const isEditingDisplay =
    editingDisplayIndex !== null &&
    editingDisplayIndex !== undefined &&
    side.display[editingDisplayIndex] !== undefined

  const previewHint = isEditingDisplay
    ? t(previewDragHintKey(isWideLayout))
    : t(previewTapHintKey(isWideLayout))

  return (
    <section className={WIZARD_STEP_SECTION}>
      <h1 className="text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
        {sideNumberLabel(side.playOrder, t)}
      </h1>
      <p className="mt-1 text-xs text-text-muted lg:text-sm">{programName}</p>

      <div className={WIZARD_EDITOR_GRID}>
        <div className={WIZARD_PREVIEW_COLUMN}>
          <SidePreview
            side={side}
            attributes={attributes}
            selectedIndex={isEditingDisplay ? editingDisplayIndex : null}
            draggableIndex={isEditingDisplay ? editingDisplayIndex : null}
            onSelectIndex={onEditDisplay}
            onElementChange={(index, next) => onChange(updateDisplayElement(side, index, next))}
            hint={previewHint}
          />
        </div>

        <div className={WIZARD_FORM_COLUMN}>
          {isEditingDisplay ? (
            <DisplayElementEditorPanel
              side={side}
              displayIndex={editingDisplayIndex}
              attributes={attributes}
              onChange={onChange}
              onBack={() => onCloseDisplayEdit?.()}
              backLabel="createProgram.stepDisplay.backToSideList"
              t={t}
            />
          ) : (
            <>
              <ColorPickerField
                label={t('createProgram.stepSide.background')}
                value={bgColor}
                onChange={(backgroundColor) => onChange({ ...side, backgroundColor })}
                customLabel={t('createProgram.color.custom')}
                chooseLabel={t('createProgram.color.choose')}
                doneLabel={t('createProgram.color.done')}
                cancelLabel={t('createProgram.color.cancel')}
              />

              <div className="mt-3 lg:mt-4">
                <h2 className="text-sm font-semibold text-text">
                  {t('createProgram.stepSide.displaySection')}
                </h2>
                <ul className="mt-3 space-y-2">
                  {side.display.map((el, index) => (
                    <li
                      key={`display-${index}`}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface-card p-2"
                    >
                      <select
                        value={el.attributeIndex}
                        onChange={(e) =>
                          onChange(
                            updateDisplayElement(side, index, {
                              ...el,
                              attributeIndex: Number(e.target.value),
                            }),
                          )
                        }
                        className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                      >
                        {displayIndexes.map((idx) => (
                          <option key={idx} value={idx}>
                            {attributeLabel(attributes, idx)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onEditDisplay(index)}
                        className="shrink-0 rounded-lg px-3 py-2.5 text-xs font-medium text-accent hover:opacity-80"
                      >
                        {t('createProgram.config.open')} →
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onChange(addDisplayElement(side, attributes))}
                  className="mt-2 w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-accent hover:border-accent"
                >
                  + {t('createProgram.stepSide.addDisplay')}
                </button>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-semibold text-text">
                  {t('createProgram.stepSide.playbackSection')}
                </h2>
                <p className="mt-1 text-xs text-text-muted">{t('createProgram.stepSide.playbackHint')}</p>
                <div className="mt-3">
                  <PlayStepEditor side={side} attributes={attributes} onChange={onChange} t={t} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {hasAudio && (
                    <button
                      type="button"
                      onClick={() => onChange(addPlayStep(side, attributes))}
                      className="min-h-11 flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-accent hover:border-accent"
                    >
                      + {t('createProgram.stepSide.addPlay')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(addPauseStep(side))}
                    className="min-h-11 flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-accent hover:border-accent"
                  >
                    + {t('createProgram.stepSide.addPause')}
                  </button>
                </div>
              </div>

              <div className={WIZARD_ACTIONS}>
                <button type="button" onClick={onBack} className={WIZARD_ACTION_PRIMARY}>
                  {t('createProgram.stepSide.backToSides')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
