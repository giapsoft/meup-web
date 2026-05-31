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

export function slugFieldKey(label: string): string {
  const words = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return 'field'
  }

  const camel =
    words[0] +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')

  return camel.replace(/[^a-zA-Z0-9]/g, '') || 'field'
}

export function audioKeyForBase(keyBase: string): string {
  if (keyBase.endsWith('Audio')) {
    return keyBase
  }
  return `${keyBase}Audio`
}

/** Expand one UI row into backend `ItemSchema.attributes` entries. */
export function expandSchemaField(row: SchemaFieldRow): ItemSchemaAttribute[] {
  const keyBase = row.keyBase.trim() || slugFieldKey(row.label)

  switch (row.uiType) {
    case 'text':
      return [{ key: keyBase, type: 'text' }]
    case 'image':
      return [{ key: keyBase, type: 'image' }]
    case 'text+audio':
      return [
        { key: keyBase, type: 'text' },
        { key: audioKeyForBase(keyBase), type: 'audio' },
      ]
  }
}

export function expandSchemaFields(rows: SchemaFieldRow[]): ItemSchemaAttribute[] {
  return rows.flatMap(expandSchemaField)
}

export function createSchemaRow(
  partial: Partial<SchemaFieldRow> & Pick<SchemaFieldRow, 'label' | 'uiType'>,
): SchemaFieldRow {
  const label = partial.label.trim()
  const keyBase = partial.keyBase?.trim() || slugFieldKey(label)
  return {
    id: partial.id ?? crypto.randomUUID(),
    label,
    uiType: partial.uiType,
    keyBase,
  }
}

/** Default row specs — labels come from i18n at runtime. */
export const PRESET_SCHEMA_ROW_SPECS: Array<{
  labelKey: TranslationKey
  uiType: SchemaFieldUiType
  keyBase: string
}> = [
  { labelKey: 'createProgram.preset.studyText', uiType: 'text+audio', keyBase: 'studyText' },
  { labelKey: 'createProgram.preset.ipa', uiType: 'text', keyBase: 'ipa' },
  { labelKey: 'createProgram.preset.nativeText', uiType: 'text+audio', keyBase: 'nativeText' },
  { labelKey: 'createProgram.preset.image', uiType: 'image', keyBase: 'image' },
]

export function newEmptySchemaRow(): SchemaFieldRow {
  return createSchemaRow({ label: '', uiType: 'text', keyBase: '' })
}
