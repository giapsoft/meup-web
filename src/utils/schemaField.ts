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

/** Build API `ItemSchema` from wizard editor state. */
export function itemSchemaFromEditor(state: ItemSchemaEditorState): ItemSchema {
  return {
    hasImage: state.hasImage,
    attrs: state.fields.map((row) => ({
      key: row.key.trim(),
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
        key: t(spec.labelKey),
        uiType: spec.uiType,
        langType: spec.langType,
      }),
    ),
  }
}

export function createSchemaRow(
  partial: Partial<SchemaFieldRow> & Pick<SchemaFieldRow, 'uiType'>,
): SchemaFieldRow {
  return {
    id: partial.id ?? randomUUID(),
    key: partial.key?.trim() ?? '',
    description: partial.description ?? '',
    uiType: partial.uiType,
    langType: partial.langType,
  }
}

/** Default row specs — key text from i18n; langType fixed for presets. */
export const PRESET_SCHEMA_ROW_SPECS: Array<{
  labelKey: TranslationKey
  uiType: SchemaFieldUiType
  langType?: LangType
}> = [
  { labelKey: 'createProgram.preset.studyText', uiType: 'text+audio', langType: 'study' },
  { labelKey: 'createProgram.preset.ipa', uiType: 'text' },
  { labelKey: 'createProgram.preset.nativeText', uiType: 'text+audio', langType: 'native' },
]

export function newEmptySchemaRow(): SchemaFieldRow {
  return createSchemaRow({ key: '', uiType: 'text+audio', langType: 'study' })
}
