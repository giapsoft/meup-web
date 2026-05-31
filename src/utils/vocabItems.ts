import type {
  ItemSchemaAttribute,
  LevelRangeDraft,
  VocabItemDraft,
  VocabMediaExportMeta,
} from '../types/program'
import { revokeVocabItemMedia } from './vocabMedia'

export function textAttributes(attributes: ItemSchemaAttribute[]): ItemSchemaAttribute[] {
  return attributes.filter((a) => a.type === 'text')
}

export function createEmptyVocabItem(attributes: ItemSchemaAttribute[]): VocabItemDraft {
  const values: Record<string, string> = {}
  for (const attr of attributes) {
    values[attr.key] = ''
  }
  return { id: crypto.randomUUID(), values }
}

export function addVocabItem(items: VocabItemDraft[], attributes: ItemSchemaAttribute[]): VocabItemDraft[] {
  return [...items, createEmptyVocabItem(attributes)]
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

export function requiredImageKeysForDisplay(
  levels: LevelRangeDraft[],
  attributes: ItemSchemaAttribute[],
): string[] {
  const keys = new Set<string>()
  for (const level of levels) {
    for (const side of level.sides) {
      for (const el of side.display) {
        const attr = attributes[el.attributeIndex]
        if (attr?.type === 'image') {
          keys.add(attr.key)
        }
      }
    }
  }
  return [...keys]
}

export function requiredAudioKeysForPlaySteps(
  levels: LevelRangeDraft[],
  attributes: ItemSchemaAttribute[],
): string[] {
  const keys = new Set<string>()
  for (const level of levels) {
    for (const side of level.sides) {
      for (const step of side.playSteps) {
        if (step.kind !== 'play' || !step.attributeKey) {
          continue
        }
        const attr = attributes.find((a) => a.key === step.attributeKey)
        if (attr?.type === 'audio') {
          keys.add(attr.key)
        }
      }
    }
  }
  return [...keys]
}

function hasMediaFile(item: VocabItemDraft, key: string): boolean {
  return Boolean(item.media?.[key]?.file)
}

export function validateVocabItems(
  items: VocabItemDraft[],
  levels: LevelRangeDraft[],
  attributes: ItemSchemaAttribute[],
): { ok: true } | { ok: false; reason: 'empty' | 'missingRequired' | 'missingMedia'; keys?: string[] } {
  if (items.length === 0) {
    return { ok: false, reason: 'empty' }
  }
  const requiredText = requiredTextKeysForDisplay(levels, attributes)
  for (const item of items) {
    for (const key of requiredText) {
      if (!item.values[key]?.trim()) {
        return { ok: false, reason: 'missingRequired', keys: requiredText }
      }
    }
  }
  const requiredImages = requiredImageKeysForDisplay(levels, attributes)
  const requiredAudio = requiredAudioKeysForPlaySteps(levels, attributes)
  const requiredMedia = [...requiredImages, ...requiredAudio]
  for (const item of items) {
    for (const key of requiredMedia) {
      if (!hasMediaFile(item, key)) {
        return { ok: false, reason: 'missingMedia', keys: requiredMedia }
      }
    }
  }
  return { ok: true }
}

export function toExportItems(
  items: VocabItemDraft[],
): Array<{ values: Record<string, string>; mediaFiles?: Record<string, VocabMediaExportMeta> }> {
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

export function primaryTextAttributeKey(attributes: ItemSchemaAttribute[]): string | undefined {
  return textAttributes(attributes)[0]?.key
}
