import type { ItemSchema, VocabItemDraft } from '../types/program'
import { IMAGE_MEDIA_KEY } from '../types/program'
import { layoutSlotLabel, mediaSlots, type MediaSlot } from './itemSchemaLayout'

export function createLocalResourceId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 32)
}

export function attachVocabItemMedia(
  items: VocabItemDraft[],
  itemId: string,
  mediaKey: string,
  file: File,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const prev = item.media?.[mediaKey]
    if (prev?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    const localResourceId = createLocalResourceId()
    return {
      ...item,
      values: { ...item.values, [mediaKey]: localResourceId },
      media: {
        ...item.media,
        [mediaKey]: { file, objectUrl, localResourceId },
      },
    }
  })
}

export function detachVocabItemMedia(
  items: VocabItemDraft[],
  itemId: string,
  mediaKey: string,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const prev = item.media?.[mediaKey]
    if (prev?.objectUrl) {
      URL.revokeObjectURL(prev.objectUrl)
    }
    const nextMedia = { ...(item.media ?? {}) }
    delete nextMedia[mediaKey]
    const nextValues = { ...item.values }
    if (mediaKey === IMAGE_MEDIA_KEY) {
      delete nextValues[IMAGE_MEDIA_KEY]
    }
    return {
      ...item,
      values: nextValues,
      media: Object.keys(nextMedia).length > 0 ? nextMedia : undefined,
    }
  })
}

/** @deprecated use attachVocabItemMedia */
export const atmeupVocabItemMedia = attachVocabItemMedia

/** @deprecated use detachVocabItemMedia */
export const demeupVocabItemMedia = detachVocabItemMedia

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

export function schemaMediaSlots(schema: ItemSchema): MediaSlot[] {
  return mediaSlots(schema)
}

export function mediaSlotLabel(slot: MediaSlot, schema: ItemSchema): string {
  if (slot.kind === 'image') {
    return 'Image'
  }
  return layoutSlotLabel(schema, slot.layoutIndex)
}

export function acceptMimeForMediaSlot(slot: MediaSlot): string {
  if (slot.kind === 'image') {
    return 'image/*'
  }
  return 'audio/*'
}
