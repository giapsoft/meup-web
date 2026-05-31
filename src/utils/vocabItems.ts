import type { ItemSchemaAttribute, LevelRangeDraft, VocabItemDraft } from '../types/program'

export function textAttributes(attributes: ItemSchemaAttribute[]): ItemSchemaAttribute[] {
  return attributes.filter((a) => a.type === 'text')
}

export function createEmptyVocabItem(attributes: ItemSchemaAttribute[]): VocabItemDraft {
  const values: Record<string, string> = {}
  for (const attr of textAttributes(attributes)) {
    values[attr.key] = ''
  }
  return { id: crypto.randomUUID(), values }
}

export function addVocabItem(items: VocabItemDraft[], attributes: ItemSchemaAttribute[]): VocabItemDraft[] {
  return [...items, createEmptyVocabItem(attributes)]
}

export function removeVocabItem(items: VocabItemDraft[], itemId: string): VocabItemDraft[] {
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

/** Attribute keys for text fields referenced on any card face. */
export function requiredTextKeysForDisplay(
  levels: LevelRangeDraft[],
  attributes: ItemSchemaAttribute[],
): string[] {
  const keys = new Set<string>()
  for (const level of levels) {
    for (const side of level.sides) {
      for (const el of side.display) {
        const attr = attributes[el.attributeIndex]
        if (attr?.type === 'text') {
          keys.add(attr.key)
        }
      }
    }
  }
  return [...keys]
}

export function validateVocabItems(
  items: VocabItemDraft[],
  levels: LevelRangeDraft[],
  attributes: ItemSchemaAttribute[],
): { ok: true } | { ok: false; reason: 'empty' | 'missingRequired'; keys?: string[] } {
  if (items.length === 0) {
    return { ok: false, reason: 'empty' }
  }
  const required = requiredTextKeysForDisplay(levels, attributes)
  if (required.length === 0) {
    return { ok: true }
  }
  for (const item of items) {
    for (const key of required) {
      if (!item.values[key]?.trim()) {
        return { ok: false, reason: 'missingRequired', keys: required }
      }
    }
  }
  return { ok: true }
}

export function toExportItems(items: VocabItemDraft[]): Array<{ values: Record<string, string> }> {
  return items.map((item) => ({
    values: { ...item.values },
  }))
}

export function primaryTextAttributeKey(attributes: ItemSchemaAttribute[]): string | undefined {
  return textAttributes(attributes)[0]?.key
}
