import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, SideDraft } from '../../types/program'
import { attributeLabel, updateDisplayElement } from '../../utils/sideConfig'
import { DisplayElementEditorPanel } from './DisplayElementEditorPanel'
import { SidePreview } from './SidePreview'
import {
  WIZARD_EDITOR_GRID,
  WIZARD_PREVIEW_COLUMN,
  WIZARD_STEP_SECTION,
} from './wizardLayout'
import { previewDragHintKey } from './previewHints'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'

type DisplayElementEditorStepProps = {
  side: SideDraft
  displayIndex: number
  schema: ItemSchema
  onChange: (side: SideDraft) => void
  onSelectDisplayIndex: (index: number) => void
  onBack: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function DisplayElementEditorStep({
  side,
  displayIndex,
  schema,
  onChange,
  onSelectDisplayIndex,
  onBack,
  t,
}: DisplayElementEditorStepProps) {
  const isWideLayout = useWizardWideLayout()
  const el = side.display[displayIndex]
  if (!el) {
    return null
  }

  const title = attributeLabel(schema, el.attributeIndex)

  return (
    <section className={WIZARD_STEP_SECTION}>
      <h1 className="text-xl font-semibold text-text sm:text-2xl lg:text-3xl">{title}</h1>

      <div className={WIZARD_EDITOR_GRID}>
        <div className={WIZARD_PREVIEW_COLUMN}>
          <SidePreview
            side={side}
            schema={schema}
            selectedIndex={displayIndex}
            draggableIndex={displayIndex}
            onSelectIndex={onSelectDisplayIndex}
            onElementChange={(index, next) => onChange(updateDisplayElement(side, index, next))}
            hint={t(previewDragHintKey(isWideLayout))}
          />
        </div>

        <DisplayElementEditorPanel
          side={side}
          displayIndex={displayIndex}
          schema={schema}
          onChange={onChange}
          onBack={onBack}
          t={t}
          showHeading={false}
        />
      </div>
    </section>
  )
}
