import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { DisplayElement, ItemSchemaAttribute, SideDraft } from '../../types/program'
import {
  attributeLabel,
  displayLayoutBounds,
  displayableAttributeIndexes,
  isTextAttribute,
  opacityToPercent,
  percentToOpacity,
  removeDisplayElement,
  setDisplayLayoutPx,
  updateDisplayElement,
} from '../../utils/sideConfig'
import { defaultPaletteColor, displayColorOr } from '../../utils/colorPalette'
import { ColorPickerField } from './ColorPickerField'
import { SidePreview } from './SidePreview'
import { SliderField } from './SliderField'

type DisplayElementEditorStepProps = {
  side: SideDraft
  displayIndex: number
  attributes: ItemSchemaAttribute[]
  onChange: (side: SideDraft) => void
  onBack: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

const TEXT_ALIGN_OPTIONS = ['left', 'center', 'right'] as const

function alignLabel(
  key: string,
  t: (key: TranslationKey, params?: MessageParams) => string,
): string {
  if (key === 'center') {
    return t('createProgram.stepDisplay.alignCenter')
  }
  if (key === 'right') {
    return t('createProgram.stepDisplay.alignRight')
  }
  return t('createProgram.stepDisplay.alignLeft')
}

export function DisplayElementEditorStep({
  side,
  displayIndex,
  attributes,
  onChange,
  onBack,
  t,
}: DisplayElementEditorStepProps) {
  const el = side.display[displayIndex]
  if (!el) {
    return null
  }

  const isText = isTextAttribute(attributes, el.attributeIndex)
  const displayIndexes = displayableAttributeIndexes(attributes)
  const bounds = displayLayoutBounds(el)
  const title = attributeLabel(attributes, el.attributeIndex)

  function patch(next: DisplayElement) {
    onChange(updateDisplayElement(side, displayIndex, next))
  }

  function confirmDelete() {
    if (window.confirm(t('createProgram.stepDisplay.confirmDelete'))) {
      onChange(removeDisplayElement(side, displayIndex))
      onBack()
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
      <h1 className="text-xl font-semibold text-text sm:text-2xl">{title}</h1>

      <div className="mt-5">
        <SidePreview
          side={side}
          attributes={attributes}
          selectedIndex={displayIndex}
          draggableIndex={displayIndex}
          onElementChange={(index, next) => onChange(updateDisplayElement(side, index, next))}
          hint={t('createProgram.preview.dragHint')}
        />
      </div>

      <div className="mt-5 space-y-3">
        <label className="block rounded-xl border border-border bg-surface-card p-3">
          <span className="text-sm font-medium text-text">{t('createProgram.stepDisplay.attributeType')}</span>
          <select
            value={el.attributeIndex}
            onChange={(e) => patch({ ...el, attributeIndex: Number(e.target.value) })}
            className="mt-2 w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text"
          >
            {displayIndexes.map((idx) => (
              <option key={idx} value={idx}>
                {attributeLabel(attributes, idx)} (
                {attributes[idx].type === 'image'
                  ? t('createProgram.stepDisplay.typeImage')
                  : t('createProgram.stepDisplay.typeText')}
                )
              </option>
            ))}
          </select>
        </label>

        <SliderField
          label={t('createProgram.stepDisplay.top')}
          value={bounds.top}
          min={0}
          max={bounds.maxTop}
          unit=" px"
          onChange={(top) => patch(setDisplayLayoutPx(el, { top }))}
        />
        <SliderField
          label={t('createProgram.stepDisplay.left')}
          value={bounds.left}
          min={0}
          max={bounds.maxLeft}
          unit=" px"
          onChange={(left) => patch(setDisplayLayoutPx(el, { left }))}
        />
        <SliderField
          label={t('createProgram.stepDisplay.width')}
          value={bounds.width}
          min={bounds.minW}
          max={bounds.maxWidth}
          unit=" px"
          onChange={(width) => patch(setDisplayLayoutPx(el, { width }))}
        />
        <SliderField
          label={t('createProgram.stepDisplay.height')}
          value={bounds.height}
          min={bounds.minH}
          max={bounds.maxHeight}
          unit=" px"
          onChange={(height) => patch(setDisplayLayoutPx(el, { height }))}
        />
        <SliderField
          label={
            isText
              ? t('createProgram.stepDisplay.borderRadiusText')
              : t('createProgram.stepDisplay.borderRadius')
          }
          value={el.borderRadius ?? 0}
          min={0}
          max={32}
          unit=" px"
          onChange={(borderRadius) => patch({ ...el, borderRadius })}
        />

        {isText && (
          <>
            <SliderField
              label={t('createProgram.stepDisplay.maxLines')}
              value={el.maxLines ?? 0}
              min={0}
              max={5}
              onChange={(maxLines) => patch({ ...el, maxLines })}
            />

            <ColorPickerField
              label={t('createProgram.stepDisplay.textColor')}
              value={displayColorOr(el.color, defaultPaletteColor())}
              onChange={(color) => patch({ ...el, color })}
              customLabel={t('createProgram.color.custom')}
              chooseLabel={t('createProgram.color.choose')}
              doneLabel={t('createProgram.color.done')}
              cancelLabel={t('createProgram.color.cancel')}
            />
            <ColorPickerField
              label={t('createProgram.stepDisplay.outstandingColor')}
              value={displayColorOr(el.outstandingColor, defaultPaletteColor())}
              onChange={(outstandingColor) => patch({ ...el, outstandingColor })}
              customLabel={t('createProgram.color.custom')}
              chooseLabel={t('createProgram.color.choose')}
              doneLabel={t('createProgram.color.done')}
              cancelLabel={t('createProgram.color.cancel')}
            />
            <ColorPickerField
              label={t('createProgram.stepDisplay.bgColor')}
              value={displayColorOr(el.backgroundColor, defaultPaletteColor())}
              onChange={(backgroundColor) => patch({ ...el, backgroundColor })}
              customLabel={t('createProgram.color.custom')}
              chooseLabel={t('createProgram.color.choose')}
              doneLabel={t('createProgram.color.done')}
              cancelLabel={t('createProgram.color.cancel')}
            />

            <SliderField
              label={t('createProgram.stepDisplay.bgOpacity')}
              value={opacityToPercent(el.backgroundOpacity)}
              min={0}
              max={100}
              step={10}
              unit="%"
              onChange={(pct) => patch({ ...el, backgroundOpacity: percentToOpacity(pct) })}
            />

            <div className="rounded-xl border border-border bg-surface-card p-3">
              <p className="text-sm font-medium text-text">{t('createProgram.stepDisplay.textAlign')}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {TEXT_ALIGN_OPTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => patch({ ...el, textAlign: key })}
                    className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-medium active:scale-[0.98] ${
                      (el.textAlign || 'left') === key
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border text-text-muted'
                    }`}
                  >
                    {alignLabel(key, t)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={confirmDelete}
        className="mt-6 w-full min-h-11 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-red-400 active:border-red-400"
      >
        {t('createProgram.stepDisplay.delete')}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="mt-3 w-full min-h-12 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-medium text-text-muted active:bg-surface-hover"
      >
        {t('createProgram.stepDisplay.backToSide')}
      </button>
    </section>
  )
}
