import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchema, SideDraft } from '../../types/program'
import { attributeLabel, updateDisplayElement } from '../../utils/sideConfig'
import { DisplayElementEditorPanel } from './DisplayElementEditorPanel'
import { SidePreview } from './SidePreview'

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
  const el = side.display[displayIndex]
  if (!el) {
    return null
  }

  const title = attributeLabel(schema, el.attributeIndex)

  return (
    <section className="min-w-0">
      <div className="lg:mt-4 lg:grid lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-10">
        <div className="sticky top-0 z-10 bg-surface-raised lg:self-start">
          <SidePreview
            side={side}
            schema={schema}
            selectedIndex={displayIndex}
            draggableIndex={displayIndex}
            onSelectIndex={onSelectDisplayIndex}
            onElementChange={(index, next) => onChange(updateDisplayElement(side, index, next))}
          />
        </div>

        <div className="mt-4 lg:mt-0">
          <h1 className="mb-4 text-xl font-semibold text-text sm:text-2xl">{title}</h1>
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
      </div>
    </section>
  )
}
