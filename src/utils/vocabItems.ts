import type { ItemSchema, LevelRangeDraft, VocabItemDraft } from '../types/program'
import { IMAGE_MEDIA_KEY } from '../types/program'
import { randomUUID } from './id'
import {
  audioLayoutIndexForKey,
  imageLayoutIndex,
  rowLength,
  textAudioAttrs,
} from './itemSchemaLayout'
import { audioMediaValueKey } from './manualMedia'
import { revokeVocabItemMedia } from './vocabMedia'

export function textAttrs(schema: ItemSchema) {
  return schema.attrs
}

export function createEmptyVocabItem(schema: ItemSchema): VocabItemDraft {
  const values: Record<string, string> = {}
  for (const attr of schema.attrs) {
    values[attr.key] = ''
  }
  return { id: randomUUID(), values }
}

export function addVocabItem(items: VocabItemDraft[], schema: ItemSchema): VocabItemDraft[] {
  return [...items, createEmptyVocabItem(schema)]
}

export function removeVocabItem(items: VocabItemDraft[], itemId: string): VocabItemDraft[] {
  const removed = items.find((item) => item.id === itemId)
  if (removed) {
    revokeVocabItemMedia(removed)
  }
  return items.filter((item) => item.id !== itemId)
}

export function updateVocabItemValue(
  items: VocabItemDraft[],
  itemId: string,
  key: string,
  value: string,
): VocabItemDraft[] {
  return items.map((item) =>
    item.id === itemId ? { ...item, values: { ...item.values, [key]: value } } : item,
  )
}

/** Text attr keys referenced on any card face display. */
export function requiredTextKeysForDisplay(
  levels: LevelRangeDraft[],
  schema: ItemSchema,
): string[] {
  const keys = new Set<string>()
  for (const level of levels) {
    for (const side of level.sides) {
      for (const el of side.display) {
        if (el.attributeIndex < schema.attrs.length) {
          const attr = schema.attrs[el.attributeIndex]
          if (attr) {
            keys.add(attr.key)
          }
        }
      }
    }
  }
  return [...keys]
}

export function validateVocabItems(
  items: VocabItemDraft[],
  levels: LevelRangeDraft[],
  schema: ItemSchema,
): { ok: true } | { ok: false; reason: 'empty' | 'missingRequired'; keys?: string[] } {
  if (items.length === 0) {
    return { ok: false, reason: 'empty' }
  }
  const requiredText = requiredTextKeysForDisplay(levels, schema)
  for (const item of items) {
    for (const key of requiredText) {
      if (!item.values[key]?.trim()) {
        return { ok: false, reason: 'missingRequired', keys: requiredText }
      }
    }
  }
  return { ok: true }
}

export function toCompactItemRow(schema: ItemSchema, item: VocabItemDraft): string[] {
  const row = new Array(rowLength(schema)).fill('')
  for (let i = 0; i < schema.attrs.length; i++) {
    const attr = schema.attrs[i]
    row[i] = (item.values[attr.key] ?? '').trim()
  }
  for (const attr of textAudioAttrs(schema)) {
    const audioIdx = audioLayoutIndexForKey(schema, attr.key)
    const ref = (item.values[audioMediaValueKey(attr.key)] ?? '').trim()
    if (audioIdx >= 0 && ref) {
      row[audioIdx] = ref
    }
  }
  if (schema.hasImage) {
    const imgIdx = imageLayoutIndex(schema)
    const ref = (item.values[IMAGE_MEDIA_KEY] ?? '').trim()
    if (imgIdx >= 0 && ref) {
      row[imgIdx] = ref
    }
  }
  return row
}

/** Map one published compact item row into editor values (text + media refs). */
export function fromCompactItemRow(schema: ItemSchema, row: string[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (let i = 0; i < schema.attrs.length; i++) {
    const attr = schema.attrs[i]
    values[attr.key] = (row[i] ?? '').trim()
  }
  for (const attr of textAudioAttrs(schema)) {
    const audioIdx = audioLayoutIndexForKey(schema, attr.key)
    if (audioIdx >= 0) {
      const ref = (row[audioIdx] ?? '').trim()
      if (ref) {
        values[audioMediaValueKey(attr.key)] = ref
      }
    }
  }
  if (schema.hasImage) {
    const imgIdx = imageLayoutIndex(schema)
    if (imgIdx >= 0) {
      const ref = (row[imgIdx] ?? '').trim()
      if (ref) {
        values[IMAGE_MEDIA_KEY] = ref
      }
    }
  }
  return values
}

export function toExportItems(
  _schema: ItemSchema,
  items: VocabItemDraft[],
): Array<{ values: Record<string, string>; mediaFiles?: Record<string, import('../types/program').VocabMediaExportMeta> }> {
  return items.map((item) => {
    const mediaFiles = item.media
      ? Object.fromEntries(
          Object.entries(item.media).map(([key, entry]) => [
            key,
            {
              fileName: entry.file.name,
              mimeType: entry.file.type,
              size: entry.file.size,
              localResourceId: entry.localResourceId,
            },
          ]),
        )
      : undefined
    return {
      values: { ...item.values },
      ...(mediaFiles && Object.keys(mediaFiles).length > 0 ? { mediaFiles } : {}),
    }
  })
}

export function primaryTextAttributeKey(schema: ItemSchema): string | undefined {
  return schema.attrs[0]?.key
}

/** @deprecated alias */
export const textAttributes = textAttrs
