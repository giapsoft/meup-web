import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaEditorState, SchemaFieldRow, SchemaFieldUiType } from '../../types/program'
import { SCHEMA_UI_TYPES, newEmptySchemaRow } from '../../utils/schemaField'
import { SchemaFieldList } from './SchemaFieldList'

type ItemSchemaEditorProps = {
  value: ItemSchemaEditorState
  onChange: (next: ItemSchemaEditorState) => void
  fieldTypeKeys: Record<SchemaFieldUiType, TranslationKey>
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function ItemSchemaEditor({ value, onChange, fieldTypeKeys, t }: ItemSchemaEditorProps) {
  function updateField(id: string, patch: Partial<SchemaFieldRow>) {
    onChange({
      ...value,
      fields: value.fields.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    })
  }

  function removeField(id: string) {
    onChange({ ...value, fields: value.fields.filter((row) => row.id !== id) })
  }

  function addField(uiType: SchemaFieldUiType) {
    onChange({ ...value, fields: [...value.fields, { ...newEmptySchemaRow(), uiType }] })
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card/50 p-3 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {t('createProgram.stepSchema.itemSchemaTitle')}
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3">
        <input
          type="checkbox"
          checked={value.hasImage}
          onChange={(e) => onChange({ ...value, hasImage: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
        />
        <span>
          <span className="block text-sm font-medium text-text">
            {t('createProgram.stepSchema.hasImage')}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {t('createProgram.stepSchema.hasImageHint')}
          </span>
        </span>
      </label>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">
        {t('createProgram.stepSchema.attributesTitle')}
      </p>

      <div className="mt-2">
        <SchemaFieldList
          fields={value.fields}
          fieldTypeKeys={fieldTypeKeys}
          onReorder={(fields) => onChange({ ...value, fields })}
          onUpdate={updateField}
          onRemove={removeField}
          t={t}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SCHEMA_UI_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addField(type)}
            className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent"
          >
            + {t('createProgram.stepSchema.add')} {t(fieldTypeKeys[type])}
          </button>
        ))}
      </div>
    </div>
  )
}
