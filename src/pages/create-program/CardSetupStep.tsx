import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useMemo, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import type { ItemSchemaAttribute, LevelRangeDraft, SideDraft } from '../../types/program'
import {
  adjustLevelRangeMaxLvl,
  buildConfigLevelItems,
  configLevelItemLabel,
  insertNewLevelRange,
  insertedLevelId,
} from '../../utils/levelConfig'
import { createEmptySide, normalizePlayOrder, sideNumberLabel } from '../../utils/programConfig'
import { previewTapHintKey } from './previewHints'
import { SidePreview } from './SidePreview'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_STEP_SECTION,
} from './wizardLayout'

type CardSetupStepProps = {
  programName: string
  attributes: ItemSchemaAttribute[]
  levels: LevelRangeDraft[]
  activeLevelId: string
  onLevelsChange: (levels: LevelRangeDraft[]) => void
  onActiveLevelChange: (levelId: string) => void
  onEditSide: (sideId: string) => void
  onBack: () => void
  onContinue: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="4" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="4" r="1.25" className="text-text-muted" />
      <circle cx="5" cy="8" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="8" r="1.25" className="text-text-muted" />
      <circle cx="5" cy="12" r="1.25" className="text-text-muted" />
      <circle cx="11" cy="12" r="1.25" className="text-text-muted" />
    </svg>
  )
}

type SortableSideRowProps = {
  side: SideDraft
  isPreviewSelected: boolean
  onPreviewSelect: () => void
  onEdit: () => void
  onRemove: () => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function SortableSideRow({
  side,
  isPreviewSelected,
  onPreviewSelect,
  onEdit,
  onRemove,
  t,
}: SortableSideRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: side.id,
  })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-2 rounded-xl border bg-surface-card p-3 ${
        isPreviewSelected ? 'border-accent ring-1 ring-accent/30' : 'border-border'
      } ${isDragging ? 'z-10 opacity-60 shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-border px-2 py-2 active:cursor-grabbing"
        aria-label={t('createProgram.stepSchema.dragHandle')}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>
      <button
        type="button"
        onClick={onPreviewSelect}
        className="min-w-0 flex-1 rounded-lg text-left hover:bg-surface-hover/50"
      >
        <p className="truncate text-sm font-medium text-text">
          {sideNumberLabel(side.playOrder, t)}
        </p>
        <p className="text-xs text-text-muted">
          {t('createProgram.stepCardSetup.sideMeta', {
            fields: side.display.length,
            steps: side.playSteps.length,
          })}
        </p>
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
      >
        {t('createProgram.stepCardSetup.editSide')}
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
        aria-label={t('createProgram.stepCardSetup.removeSide')}
      >
        ✕
      </button>
    </li>
  )
}

export function CardSetupStep({
  programName,
  attributes,
  levels,
  activeLevelId,
  onLevelsChange,
  onActiveLevelChange,
  onEditSide,
  onBack,
  onContinue,
  t,
}: CardSetupStepProps) {
  const isWideLayout = useWizardWideLayout()
  const [previewSideId, setPreviewSideId] = useState<string | null>(null)
  const levelItems = useMemo(() => buildConfigLevelItems(levels), [levels])
  const activeLevel = levels.find((l) => l.id === activeLevelId) ?? levels[0]
  const activeLevelIndex = levels.findIndex((l) => l.id === activeLevel?.id)
  const activeLevelItem =
    activeLevelIndex >= 0 ? levelItems[activeLevelIndex] : undefined

  const previewSide = useMemo(() => {
    if (!activeLevel) {
      return undefined
    }
    if (previewSideId) {
      const selected = activeLevel.sides.find((s) => s.id === previewSideId)
      if (selected) {
        return selected
      }
    }
    return activeLevel.sides[0]
  }, [activeLevel, previewSideId])

  useEffect(() => {
    if (!activeLevel) {
      setPreviewSideId(null)
      return
    }
    setPreviewSideId((prev) => {
      if (prev && activeLevel.sides.some((s) => s.id === prev)) {
        return prev
      }
      return activeLevel.sides[0]?.id ?? null
    })
  }, [activeLevel?.id, activeLevel?.sides.length])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function updateActiveLevel(patch: Partial<LevelRangeDraft>) {
    if (!activeLevel) {
      return
    }
    onLevelsChange(levels.map((l) => (l.id === activeLevel.id ? { ...l, ...patch } : l)))
  }

  function handleSideDragEnd(event: DragEndEvent) {
    if (!activeLevel) {
      return
    }
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const sides = activeLevel.sides
    const oldIndex = sides.findIndex((s) => s.id === active.id)
    const newIndex = sides.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) {
      return
    }
    updateActiveLevel({ sides: normalizePlayOrder(arrayMove(sides, oldIndex, newIndex)) })
  }

  function addSide() {
    if (!activeLevel) {
      return
    }
    const nextOrder = activeLevel.sides.length + 1
    const side = createEmptySide(attributes, nextOrder)
    updateActiveLevel({ sides: [...activeLevel.sides, side] })
  }

  function removeSide(sideId: string) {
    if (!activeLevel) {
      return
    }
    updateActiveLevel({
      sides: normalizePlayOrder(activeLevel.sides.filter((s) => s.id !== sideId)),
    })
  }

  function handleAddLevel() {
    const next = insertNewLevelRange(levels)
    onLevelsChange(next)
    const focusId = insertedLevelId(levels, next)
    if (focusId) {
      onActiveLevelChange(focusId)
    }
  }

  function adjustBoundary(delta: number) {
    if (activeLevelIndex < 0) {
      return
    }
    const next = adjustLevelRangeMaxLvl(levels, activeLevelIndex, delta)
    if (next) {
      onLevelsChange(next)
    }
  }

  if (!activeLevel) {
    return null
  }

  return (
    <section className={WIZARD_STEP_SECTION}>
      <h1 className="text-xl font-semibold text-text sm:text-2xl lg:text-3xl">
        {t('createProgram.stepCardSetup.title')}
      </h1>
      <p className="mt-2 text-sm text-text-muted lg:text-base">{t('createProgram.stepCardSetup.hint')}</p>
      <p className="mt-1 text-xs text-text-muted lg:text-sm">{programName}</p>

      <div className="mt-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 xl:gap-10">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {levelItems.map((item) => {
              const level = levels[item.index]
              if (!level) {
                return null
              }
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => onActiveLevelChange(level.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium lg:text-sm ${
                    level.id === activeLevel.id
                      ? 'bg-accent text-surface'
                      : 'border border-border text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {configLevelItemLabel(item, t)}
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleAddLevel}
              className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent lg:text-sm"
            >
              + {t('createProgram.stepCardSetup.addLevel')}
            </button>
          </div>

          {levels.length > 1 && activeLevelItem && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-card p-3">
              <p className="text-sm text-text">{configLevelItemLabel(activeLevelItem, t)}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={activeLevelIndex <= 0}
                  onClick={() => adjustBoundary(-1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover disabled:opacity-30"
                  aria-label={t('createProgram.stepCardSetup.adjustLeft')}
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={activeLevelIndex + 1 >= levels.length}
                  onClick={() => adjustBoundary(1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover disabled:opacity-30"
                  aria-label={t('createProgram.stepCardSetup.adjustRight')}
                >
                  →
                </button>
              </div>
            </div>
          )}

          {previewSide && (
            <div className="hidden lg:block">
              <SidePreview
                side={previewSide}
                attributes={attributes}
                hint={t(previewTapHintKey(isWideLayout))}
              />
              <p className="mt-2 text-xs text-text-muted">
                {t('createProgram.stepCardSetup.previewHint')}
              </p>
            </div>
          )}
        </div>

        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSideDragEnd}>
            <SortableContext
              items={activeLevel.sides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {activeLevel.sides.map((side) => (
                  <SortableSideRow
                    key={side.id}
                    side={side}
                    isPreviewSelected={side.id === previewSide?.id}
                    onPreviewSelect={() => setPreviewSideId(side.id)}
                    onEdit={() => onEditSide(side.id)}
                    onRemove={() => removeSide(side.id)}
                    t={t}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={addSide}
            className="mt-4 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent lg:text-sm"
          >
            + {t('createProgram.stepCardSetup.addSide')}
          </button>
        </div>
      </div>

      <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
        <button
          type="button"
          onClick={onBack}
          className={WIZARD_ACTION_SECONDARY}
        >
          {t('createProgram.stepSchema.back')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className={WIZARD_ACTION_PRIMARY}
        >
          {t('createProgram.stepSchema.continue')}
        </button>
      </div>
    </section>
  )
}
