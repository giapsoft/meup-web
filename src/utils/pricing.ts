import { App } from '../app/App'
import { audioMediaValueKey } from './manualMedia'

/** Minimum manual vocab rows — hardcoded, not from WebConfig. */
export const MANUAL_MIN_VOCAB_ITEMS = 8

export type ManualPricingItem = {
  values: Record<string, string>
}

export type ManualPricingSchema = {
  hasImage: boolean
  attrs: Array<{ key: string; type: string }>
}

export function validateItemCount(value: number): 'insufficient' | 'too_many' | null {
  return App.get().validateItemCount(value)
}

/** AI flows: upfront charge at create (`count × vocabPrice`). */
export function estimateAIVocabCredits(count: number): number {
  return App.get().vocabPrice() * Math.max(1, count)
}

function hasMediaKey(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

/** Missing media slots billed when `generateMediaForMissingItems` is true at create. */
export function calculateManualMediaPrice(
  items: ManualPricingItem[],
  schema: ManualPricingSchema,
  generateMediaForMissingItems: boolean,
): number {
  if (!generateMediaForMissingItems || items.length === 0) {
    return 0
  }

  let audioSlots = 0
  let imageSlots = 0

  for (const item of items) {
    for (const attr of schema.attrs) {
      if (attr.type === 'text+audio' && !hasMediaKey(item.values[audioMediaValueKey(attr.key)])) {
        audioSlots++
      }
    }
    if (schema.hasImage && !hasMediaKey(item.values.image)) {
      imageSlots++
    }
  }

  return audioSlots * App.get().audioPrice() + imageSlots * App.get().imagePrice()
}
