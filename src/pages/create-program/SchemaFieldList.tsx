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
import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { LangType, SchemaFieldRow } from '../../types/program'

type SchemaFieldListProps = {
  fields: SchemaFieldRow[]
  studyLangLabel: string
  nativeLangLabel: string
  onReorder: (fields: SchemaFieldRow[]) => void
  onUpdate: (id: string, patch: Partial<SchemaFieldRow>) => void
  onRemove: (id: string) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

/** Combined uiType + langType choices exposed by the cycle button. */
type FieldRoleMode = 'text' | 'studyAudio' | 'nativeAudio'

const ROLE_CYCLE: FieldRoleMode[] = ['text', 'studyAudio', 'nativeAudio']

function resolveRoleMode(row: SchemaFieldRow): FieldRoleMode {
  if (row.uiType === 'text+audio' && row.langType === 'study') {
    return 'studyAudio'
  }
  if (row.uiType === 'text+audio' && row.langType === 'native') {
    return 'nativeAudio'
  }
  return 'text'
}

function patchForRoleMode(mode: FieldRoleMode): Pick<SchemaFieldRow, 'uiType'> & {
  langType: LangType | undefined
} {
  if (mode === 'studyAudio') {
    return { uiType: 'text+audio', langType: 'study' }
  }
  if (mode === 'nativeAudio') {
    return { uiType: 'text+audio', langType: 'native' }
  }
  return { uiType: 'text', langType: undefined }
}

function nextRoleMode(mode: FieldRoleMode): FieldRoleMode {
  const index = ROLE_CYCLE.indexOf(mode)
  return ROLE_CYCLE[(index + 1) % ROLE_CYCLE.length] ?? 'text'
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

function TextLinesIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h10M4 17h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 5 6 9H3v6h3l5 4V5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a4.5 4.5 0 0 1 0 7M18.5 5.5a8.5 8.5 0 0 1 0 13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

type SortableFieldRowProps = {
  row: SchemaFieldRow
  studyLangLabel: string
  nativeLangLabel: string
  onUpdate: (id: string, patch: Partial<SchemaFieldRow>) => void
  onRemove: (id: string) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

function SortableFieldRow({
  row,
  studyLangLabel,
  nativeLangLabel,
  onUpdate,
  onRemove,
  t,
}: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const mode = resolveRoleMode(row)
  const roleLabel =
    mode === 'studyAudio'
      ? studyLangLabel
      : mode === 'nativeAudio'
        ? nativeLangLabel
        : t('createProgram.stepSchema.role.noAudio')
  const hasAudioLang = mode !== 'text'

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-surface-card p-3 ${
        isDragging ? 'z-10 opacity-60 shadow-lg' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="flex min-h-11 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-border active:cursor-grabbing"
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
          aria-label={t('createProgram.stepSchema.fieldLabel')}
          className="min-h-11 min-w-[8rem] flex-1 basis-40 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
        />

        <button
          type="button"
          onClick={() => onUpdate(row.id, patchForRoleMode(nextRoleMode(mode)))}
          title={roleLabel}
          aria-label={roleLabel}
          className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 transition active:scale-[0.98] ${
            hasAudioLang
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border bg-surface text-text-muted hover:text-text'
          }`}
        >
          {hasAudioLang ? <VolumeIcon /> : <TextLinesIcon />}
          <span className="max-w-[7rem] truncate text-xs font-medium sm:max-w-[9rem]">
            {roleLabel}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="ml-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-red-400 active:bg-red-500/10 sm:ml-0"
          aria-label={t('createProgram.stepSchema.remove')}
        >
          ✕
        </button>
      </div>

      <input
        type="text"
        value={row.description ?? ''}
        onChange={(e) => onUpdate(row.id, { description: e.target.value })}
        placeholder={t('createProgram.stepSchema.fieldDescription')}
        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
      />
    </li>
  )
}

export function SchemaFieldList({
  fields,
  studyLangLabel,
  nativeLangLabel,
  onReorder,
  onUpdate,
  onRemove,
  t,
}: SchemaFieldListProps) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
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

  const pendingRow = pendingRemoveId
    ? fields.find((row) => row.id === pendingRemoveId)
    : undefined

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {fields.map((row) => (
              <SortableFieldRow
                key={row.id}
                row={row}
                studyLangLabel={studyLangLabel}
                nativeLangLabel={nativeLangLabel}
                onUpdate={onUpdate}
                onRemove={setPendingRemoveId}
                t={t}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title={t('createProgram.stepSchema.confirmDelete')}
        message={pendingRow?.label.trim() || undefined}
        confirmLabel={t('createProgram.stepSchema.remove')}
        cancelLabel={t('createProgram.color.cancel')}
        danger
        onCancel={() => setPendingRemoveId(null)}
        onConfirm={() => {
          if (pendingRemoveId) {
            onRemove(pendingRemoveId)
          }
          setPendingRemoveId(null)
        }}
      />
    </>
  )
}
