import type { ItemSchema, ItemSchemaEditorState, LangType, SchemaFieldRow, SchemaFieldUiType } from '../types/program'
import type { TranslationKey } from '../i18n/types'
import { randomUUID } from './id'

export const SCHEMA_UI_TYPES: SchemaFieldUiType[] = ['text', 'text+audio']

export function slugProgramId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'program'
}

/** Stable machine id for one schema attribute (independent of display label). */
export function generateSchemaKey(): string {
  const hex = randomUUID().replace(/-/g, '').slice(0, 8)
  return `attr_${hex}`
}

/** Build API `ItemSchema` from wizard editor state. */
export function itemSchemaFromEditor(state: ItemSchemaEditorState): ItemSchema {
  return {
    hasImage: state.hasImage,
    attrs: state.fields.map((row) => ({
      key: row.key.trim() || generateSchemaKey(),
      name: row.label.trim(),
      ...(row.description?.trim() ? { description: row.description.trim() } : {}),
      type: row.uiType === 'text+audio' ? 'text+audio' : 'text',
      langType: row.langType,
    })),
  }
}

/** @deprecated use itemSchemaFromEditor */
export function fieldsToItemSchema(fields: SchemaFieldRow[], hasImage: boolean): ItemSchema {
  return itemSchemaFromEditor({ hasImage, fields })
}

export function createPresetItemSchemaEditor(t: (key: TranslationKey) => string): ItemSchemaEditorState {
  return {
    hasImage: true,
    fields: PRESET_SCHEMA_ROW_SPECS.map((spec) =>
      createSchemaRow({
        label: t(spec.labelKey),
        uiType: spec.uiType,
        key: spec.key,
        langType: spec.langType,
      }),
    ),
  }
}

export function createSchemaRow(
  partial: Partial<SchemaFieldRow> & Pick<SchemaFieldRow, 'label' | 'uiType'>,
): SchemaFieldRow {
  const label = partial.label.trim()
  const key = partial.key?.trim() || generateSchemaKey()
  return {
    id: partial.id ?? randomUUID(),
    label,
    description: partial.description ?? '',
    uiType: partial.uiType,
    key,
    langType: partial.langType,
  }
}

/** Default row specs — labels from i18n; langType fixed for presets. */
export const PRESET_SCHEMA_ROW_SPECS: Array<{
  labelKey: TranslationKey
  uiType: SchemaFieldUiType
  key: string
  langType?: LangType
}> = [
  { labelKey: 'createProgram.preset.studyText', uiType: 'text+audio', key: 'studyText', langType: 'study' },
  { labelKey: 'createProgram.preset.ipa', uiType: 'text', key: 'ipa' },
  { labelKey: 'createProgram.preset.nativeText', uiType: 'text+audio', key: 'nativeText', langType: 'native' },
]

export function newEmptySchemaRow(): SchemaFieldRow {
  return createSchemaRow({ label: '', uiType: 'text' })
}
