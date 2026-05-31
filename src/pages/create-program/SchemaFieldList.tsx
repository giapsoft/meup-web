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
import type { TranslationKey } from '../../i18n/types'
import type { SchemaFieldRow, SchemaFieldUiType } from '../../types/program'
import { SCHEMA_UI_TYPES } from '../../utils/schemaField'

type SchemaFieldListProps = {
  fields: SchemaFieldRow[]
  fieldTypeKeys: Record<SchemaFieldUiType, TranslationKey>
  onReorder: (fields: SchemaFieldRow[]) => void
  onUpdate: (id: string, patch: Partial<SchemaFieldRow>) => void
  onRemove: (id: string) => void
  t: (key: TranslationKey) => string
}

function DragHandleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className="text-text-muted"
    >
      <circle cx="5" cy="4" r="1.25" />
      <circle cx="11" cy="4" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="11" cy="12" r="1.25" />
    </svg>
  )
}

type SortableFieldRowProps = {
  row: SchemaFieldRow
  fieldTypeKeys: Record<SchemaFieldUiType, TranslationKey>
  onUpdate: (id: string, patch: Partial<SchemaFieldRow>) => void
  onRemove: (id: string) => void
  t: (key: TranslationKey) => string
}

function SortableFieldRow({ row, fieldTypeKeys, onUpdate, onRemove, t }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-2 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center ${
        isDragging ? 'z-10 opacity-60 shadow-lg' : ''
      }`}
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
      <input
        type="text"
        value={row.label}
        onChange={(e) => onUpdate(row.id, { label: e.target.value })}
        placeholder={t('createProgram.stepSchema.fieldLabel')}
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
      />
      <select
        value={row.uiType}
        onChange={(e) => onUpdate(row.id, { uiType: e.target.value as SchemaFieldUiType })}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
      >
        {SCHEMA_UI_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(fieldTypeKeys[type])}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
        aria-label={t('createProgram.stepSchema.remove')}
      >
        ✕
      </button>
    </li>
  )
}

export function SchemaFieldList({
  fields,
  fieldTypeKeys,
  onReorder,
  onUpdate,
  onRemove,
  t,
}: SchemaFieldListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = fields.findIndex((row) => row.id === active.id)
    const newIndex = fields.findIndex((row) => row.id === over.id)
    if (oldIndex < 0 || newIndex < 0) {
      return
    }
    onReorder(arrayMove(fields, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-3">
          {fields.map((row) => (
            <SortableFieldRow
              key={row.id}
              row={row}
              fieldTypeKeys={fieldTypeKeys}
              onUpdate={onUpdate}
              onRemove={onRemove}
              t={t}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
