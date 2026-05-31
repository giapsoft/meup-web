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
import { sideNumberLabel } from '../../utils/programConfig'
import { ColorPickerField } from './ColorPickerField'
import { PlayStepEditor } from './PlayStepEditor'
import { SidePreview } from './SidePreview'

type SideEditorStepProps = {
  programName: string
  side: SideDraft
  attributes: ItemSchemaAttribute[]
  onChange: (side: SideDraft) => void
  onEditDisplay: (displayIndex: number) => void
  onBack: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function SideEditorStep({
  programName,
  side,
  attributes,
  onChange,
  onEditDisplay,
  onBack,
  t,
}: SideEditorStepProps) {
  const hasAudio = audioAttributeIndexes(attributes).length > 0
  const displayIndexes = displayableAttributeIndexes(attributes)
  const bgColor = displayColorOr(side.backgroundColor, defaultPaletteColor())

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
      <h1 className="text-xl font-semibold text-text sm:text-2xl">
        {sideNumberLabel(side.playOrder, t)}
      </h1>
      <p className="mt-1 text-xs text-text-muted">{programName}</p>

      <div className="mt-5">
        <SidePreview
          side={side}
          attributes={attributes}
          onSelectIndex={onEditDisplay}
          hint={t('createProgram.preview.tapToEdit')}
        />
      </div>

      <div className="mt-5">
        <ColorPickerField
          label={t('createProgram.stepSide.background')}
          value={bgColor}
          onChange={(backgroundColor) => onChange({ ...side, backgroundColor })}
          customLabel={t('createProgram.color.custom')}
          chooseLabel={t('createProgram.color.choose')}
          doneLabel={t('createProgram.color.done')}
          cancelLabel={t('createProgram.color.cancel')}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-text">{t('createProgram.stepSide.displaySection')}</h2>
        <ul className="mt-3 space-y-2">
          {side.display.map((el, index) => (
            <li
              key={`display-${index}`}
              className="rounded-xl border border-border bg-surface-card p-3"
            >
              <button
                type="button"
                onClick={() => onEditDisplay(index)}
                className="flex w-full items-center gap-3 text-left active:opacity-80"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                  {attributeLabel(attributes, el.attributeIndex)}
                </span>
                <span className="shrink-0 text-xs text-accent">{t('createProgram.config.open')} →</span>
              </button>
              {displayIndexes.length > 1 && (
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
                  className="mt-2 w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                >
                  {displayIndexes.map((idx) => (
                    <option key={idx} value={idx}>
                      {attributeLabel(attributes, idx)}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onChange(addDisplayElement(side, attributes))}
          className="mt-2 w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-accent active:border-accent"
        >
          + {t('createProgram.stepSide.addDisplay')}
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-text">{t('createProgram.stepSide.playbackSection')}</h2>
        <p className="mt-1 text-xs text-text-muted">{t('createProgram.stepSide.playbackHint')}</p>
        <div className="mt-3">
          <PlayStepEditor side={side} attributes={attributes} onChange={onChange} t={t} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {hasAudio && (
            <button
              type="button"
              onClick={() => onChange(addPlayStep(side, attributes))}
              className="min-h-11 flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-accent active:border-accent"
            >
              + {t('createProgram.stepSide.addPlay')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onChange(addPauseStep(side))}
            className="min-h-11 flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-accent active:border-accent"
          >
            + {t('createProgram.stepSide.addPause')}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 w-full min-h-12 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-medium text-text-muted active:bg-surface-hover"
      >
        {t('createProgram.stepSide.backToSides')}
      </button>
    </section>
  )
}
