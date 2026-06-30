import type { ItemSchema, LevelRangeDraft, VocabItemDraft } from '../types/program'
import { revokeVocabItemMedia } from './vocabMedia'
import { rowLength } from './itemSchemaLayout'

export function textAttrs(schema: ItemSchema) {
  return schema.attrs
}

export function createEmptyVocabItem(schema: ItemSchema): VocabItemDraft {
  const values: Record<string, string> = {}
  for (const attr of schema.attrs) {
    values[attr.key] = ''
  }
  return { id: crypto.randomUUID(), values }
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
  return row
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
