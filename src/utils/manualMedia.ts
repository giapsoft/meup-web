import type { ItemSchema, StagedServerMedia, VocabItemDraft } from '../types/program'
import { IMAGE_MEDIA_KEY } from '../types/program'
import type { MediaSlot } from './itemSchemaLayout'
import { mediaSlots } from './itemSchemaLayout'
import { MANUAL_MIN_VOCAB_ITEMS } from './pricing'

export function audioMediaValueKey(attrKey: string): string {
  return `${attrKey}:audio`
}

export function mediaValueKey(slot: MediaSlot): string {
  if (slot.kind === 'image') {
    return IMAGE_MEDIA_KEY
  }
  return audioMediaValueKey(slot.textKey ?? slot.key)
}

export function getStagedMedia(item: VocabItemDraft, valueKey: string): StagedServerMedia | undefined {
  return item.serverMedia?.[valueKey]
}

export function attachServerMedia(
  items: VocabItemDraft[],
  itemId: string,
  valueKey: string,
  media: StagedServerMedia,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    return {
      ...item,
      values: { ...item.values, [valueKey]: media.objectKey },
      serverMedia: { ...item.serverMedia, [valueKey]: media },
    }
  })
}

export function detachServerMedia(
  items: VocabItemDraft[],
  itemId: string,
  valueKey: string,
): VocabItemDraft[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item
    }
    const nextMedia = { ...(item.serverMedia ?? {}) }
    delete nextMedia[valueKey]
    const nextValues = { ...item.values }
    delete nextValues[valueKey]
    return {
      ...item,
      values: nextValues,
      serverMedia: Object.keys(nextMedia).length > 0 ? nextMedia : undefined,
    }
  })
}

export function itemHasMediaValue(item: VocabItemDraft, valueKey: string): boolean {
  return Boolean(item.values[valueKey]?.trim())
}

export function manualItemsMissingAnyMedia(items: VocabItemDraft[], schema: ItemSchema): boolean {
  const slots = mediaSlots(schema)
  if (slots.length === 0) {
    return false
  }
  return items.some((item) => slots.some((slot) => !itemHasMediaValue(item, mediaValueKey(slot))))
}

export function validateManualVocabItems(
  items: VocabItemDraft[],
  schema: ItemSchema,
): { ok: true } | { ok: false; reason: 'tooFew' | 'emptyItem' } {
  if (items.length < MANUAL_MIN_VOCAB_ITEMS) {
    return { ok: false, reason: 'tooFew' }
  }
  const textKeys = schema.attrs.map((a) => a.key)
  for (const item of items) {
    const hasAny = textKeys.some((key) => item.values[key]?.trim()) ||
      mediaSlots(schema).some((slot) => itemHasMediaValue(item, mediaValueKey(slot)))
    if (!hasAny) {
      return { ok: false, reason: 'emptyItem' }
    }
  }
  return { ok: true }
}

export function toManualApiItems(items: VocabItemDraft[]): Array<{ values: Record<string, string> }> {
  return items.map((item) => ({ values: { ...item.values } }))
}
