import type { ItemSchemaAttribute, VocabItemDraft } from '../types/program'
import { attributeLabel } from './sideConfig'

export function createLocalResourceId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
}

export function atmeupVocabItemMedia(
  items: VocabItemDraft[],
  itemId: string,
  attrKey: string,
  file: File,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const prev = item.media?.[attrKey]
    if (prev?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    const localResourceId = createLocalResourceId()
    return {
      ...item,
      values: { ...item.values, [attrKey]: localResourceId },
      media: {
        ...item.media,
        [attrKey]: { file, objectUrl, localResourceId },
      },
    }
  })
}

export function demeupVocabItemMedia(
  items: VocabItemDraft[],
  itemId: string,
  attrKey: string,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const prev = item.media?.[attrKey]
    if (prev?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    const nextMedia = { ...(item.media ?? {}) }
    delete nextMedia[attrKey]
    return {
      ...item,
      values: { ...item.values, [attrKey]: '' },
      media: Object.keys(nextMedia).length > 0 ? nextMedia : undefined,
    }
  })
}

export function revokeVocabItemMedia(item: VocabItemDraft): void {
  if (!item.media) {
    return
  }
  for (const entry of Object.values(item.media)) {
    URL.revokeObjectURL(entry.objectUrl)
  }
}

export function itemMediaObjectUrls(item: VocabItemDraft | undefined): Record<string, string> {
  if (!item?.media) {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(item.media)) {
    out[key] = entry.objectUrl
  }
  return out
}

/** All image/audio attrs from item schema (vocabulary row may have multiple of each). */
export function schemaMediaAttributes(attributes: ItemSchemaAttribute[]): ItemSchemaAttribute[] {
  return attributes.filter((attr) => attr.type === 'image' || attr.type === 'audio')
}

export function mediaAttributeLabel(
  attr: ItemSchemaAttribute,
  attributes: ItemSchemaAttribute[],
  fallback?: string,
): string {
  const idx = attributes.findIndex((a) => a.key === attr.key)
  if (idx < 0) {
    return fallback ?? '?'
  }
  return attributeLabel(attributes, idx, { fallback })
}

export function acceptMimeForAttribute(attr: ItemSchemaAttribute): string {
  if (attr.type === 'image') {
    return 'image/*'
  }
  if (attr.type === 'audio') {
    return 'audio/*'
  }
  return '*/*'
}
