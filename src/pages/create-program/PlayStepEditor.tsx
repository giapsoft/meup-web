import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaAttribute, PlayStepDraft, SideDraft } from '../../types/program'
import {
  DEFAULT_PAUSE_SECONDS,
  PLAY_STEP_PAUSE_MAX,
  PLAY_STEP_PAUSE_MIN,
  attributeLabel,
  audioAttributeIndexes,
  removePlayStep,
  reorderPlaySteps,
  updatePlayStep,
} from '../../utils/sideConfig'

type PlayStepEditorProps = {
  side: SideDraft
  attributes: ItemSchemaAttribute[]
  onChange: (side: SideDraft) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function DragHandleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="4" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="4" r="1.25" className="text-text-muted" />
      <circle cx="5" cy="8" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="8" r="1.25" className="text-text-muted" />
      <circle cx="5" cy="12" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="12" r="1.25" className="text-text-muted" />
    </svg>
  )
}

type SortablePlayStepRowProps = {
  step: PlayStepDraft
  index: number
  audioIndexes: number[]
  attributes: ItemSchemaAttribute[]
  onUpdate: (patch: Partial<PlayStepDraft>) => void
  onRemove: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function SortablePlayStepRow({
  step,
  audioIndexes,
  attributes,
  onUpdate,
  onRemove,
  t,
}: SortablePlayStepRowProps) {
  const { attributes: dndAttrs, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-border bg-surface-card p-3 ${
        isDragging ? 'z-10 opacity-70 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="flex min-h-11 min-w-11 shrink-0 touch-none items-center justify-center rounded-lg border border-border active:bg-surface-hover"
          aria-label={t('createProgram.stepSchema.dragHandle')}
          {...dndAttrs}
          {...listeners}
        >
          <DragHandleIcon />
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          {step.kind === 'play' ? (
            <label className="block">
              <span className="text-xs text-text-muted">{t('createProgram.stepSide.addPlay')}</span>
              <select
                value={step.attributeKey ?? ''}
                onChange={(e) => onUpdate({ attributeKey: e.target.value })}
                className="mt-1 w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text"
              >
                {audioIndexes.map((idx) => (
                  <option key={attributes[idx].key} value={attributes[idx].key}>
                    {attributeLabel(attributes, idx)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-muted">{t('createProgram.stepSide.addPause')}</span>
                <span className="text-sm tabular-nums text-text">
                  {step.durationSeconds ?? DEFAULT_PAUSE_SECONDS}s
                </span>
              </div>
              <input
                type="range"
                min={PLAY_STEP_PAUSE_MIN}
                max={PLAY_STEP_PAUSE_MAX}
                step={1}
                value={step.durationSeconds ?? DEFAULT_PAUSE_SECONDS}
                onChange={(e) =>
                  onUpdate({ durationSeconds: Number(e.target.value) })
                }
                className="mt-2 h-3 w-full accent-accent"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-red-400 active:bg-red-500/10"
          aria-label={t('createProgram.stepSide.deleteStep')}
        >
          ✕
        </button>
      </div>
    </li>
  )
}

export function PlayStepEditor({ side, attributes, onChange, t }: PlayStepEditorProps) {
  const audioIndexes = audioAttributeIndexes(attributes)
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const fromIndex = side.playSteps.findIndex((s) => s.id === active.id)
    const toIndex = side.playSteps.findIndex((s) => s.id === over.id)
    if (fromIndex < 0 || toIndex < 0) {
      return
    }
    onChange(reorderPlaySteps(side, fromIndex, toIndex))
  }

  function confirmRemove(index: number) {
    if (window.confirm(t('createProgram.stepSide.confirmDeleteStep'))) {
      onChange(removePlayStep(side, index))
    }
  }

  if (side.playSteps.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-text-muted">
        {t('createProgram.stepSide.playbackEmpty')}
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={side.playSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {side.playSteps.map((step, index) => (
            <SortablePlayStepRow
              key={step.id}
              step={step}
              index={index}
              audioIndexes={audioIndexes}
              attributes={attributes}
              onUpdate={(patch) => onChange(updatePlayStep(side, index, patch))}
              onRemove={() => confirmRemove(index)}
              t={t}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
