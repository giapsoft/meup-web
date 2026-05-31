import type { ItemSchemaAttribute, SchemaFieldRow, SchemaFieldUiType } from '../types/program'
import type { TranslationKey } from '../i18n/types'

export const SCHEMA_UI_TYPES: SchemaFieldUiType[] = ['text', 'text+audio', 'image']

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

/** Stable machine id for one schema attribute (independent of display name). */
export function generateSchemaKey(): string {
  const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  return `attr_${hex}`
}

export function audioKeyForBase(key: string): string {
  if (key.endsWith('Audio')) {
    return key
  }
  return `${key}Audio`
}

/** Expand one UI row into backend `ItemSchema.attributes` entries. */
export function expandSchemaField(row: SchemaFieldRow): ItemSchemaAttribute[] {
  const key = row.key.trim() || generateSchemaKey()
  const name = row.name.trim()

  switch (row.uiType) {
    case 'text':
      return [{ key, name, type: 'text' }]
    case 'image':
      return [{ key, name, type: 'image' }]
    case 'text+audio':
      return [
        { key, name, type: 'text' },
        { key: audioKeyForBase(key), name: '', type: 'audio' },
      ]
  }
}

export function expandSchemaFields(rows: SchemaFieldRow[]): ItemSchemaAttribute[] {
  return rows.flatMap(expandSchemaField)
}

export function createSchemaRow(
  partial: Partial<SchemaFieldRow> & Pick<SchemaFieldRow, 'name' | 'uiType'>,
): SchemaFieldRow {
  const name = partial.name.trim()
  const key = partial.key?.trim() || generateSchemaKey()
  return {
    id: partial.id ?? crypto.randomUUID(),
    name,
    uiType: partial.uiType,
    key,
  }
}

/** Default row specs — names come from i18n at runtime; keys are stable presets. */
export const PRESET_SCHEMA_ROW_SPECS: Array<{
  labelKey: TranslationKey
  uiType: SchemaFieldUiType
  key: string
}> = [
  { labelKey: 'createProgram.preset.studyText', uiType: 'text+audio', key: 'studyText' },
  { labelKey: 'createProgram.preset.ipa', uiType: 'text', key: 'ipa' },
  {
    labelKey: 'createProgram.preset.nativeText',
    uiType: 'text+audio',
    key: 'nativeText',
  },
  { labelKey: 'createProgram.preset.image', uiType: 'image', key: 'image' },
]

export function newEmptySchemaRow(): SchemaFieldRow {
  return createSchemaRow({ name: '', uiType: 'text' })
}
