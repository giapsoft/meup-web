import type { ItemSchemaEditorState, LevelRangeDraft, VocabItemDraft } from '../types/program'
import { buildDefaultLevels } from './defaultSides'
import { createPresetItemSchemaEditor, itemSchemaFromEditor } from './schemaField'
import { createEmptyVocabItem } from './vocabItems'

export const PRODUCT_EDIT_DRAFT_VERSION = 1

/** Serializable wizard state stored in `product.draft_data`. */
export type ProductEditDraftV1 = {
  version: typeof PRODUCT_EDIT_DRAFT_VERSION
  name: string
  itemSchemaEditor: ItemSchemaEditorState
  levels: LevelRangeDraft[]
  vocabItems: Array<{
    id: string
    values: Record<string, string>
  }>
  savedAt?: string
}

export type ParsedProductEditDraft =
  | { ok: true; draft: ProductEditDraftV1 }
  | { ok: false; reason: 'empty' | 'invalid' }

export function serializeProductEditDraft(draft: ProductEditDraftV1): string {
  return JSON.stringify({
    ...draft,
    version: PRODUCT_EDIT_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
  })
}

export function parseProductEditDraft(raw: string): ParsedProductEditDraft {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty' }
  }
  try {
    const parsed = JSON.parse(trimmed) as Partial<ProductEditDraftV1>
    if (
      parsed.version !== PRODUCT_EDIT_DRAFT_VERSION ||
      typeof parsed.name !== 'string' ||
      !parsed.itemSchemaEditor ||
      !Array.isArray(parsed.levels) ||
      !Array.isArray(parsed.vocabItems)
    ) {
      return { ok: false, reason: 'invalid' }
    }
    return {
      ok: true,
      draft: {
        version: PRODUCT_EDIT_DRAFT_VERSION,
        name: parsed.name,
        itemSchemaEditor: parsed.itemSchemaEditor,
        levels: parsed.levels,
        vocabItems: parsed.vocabItems,
        savedAt: parsed.savedAt,
      },
    }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

export function createDefaultEditDraft(
  productName: string,
  t: (key: import('../i18n/types').TranslationKey) => string,
): ProductEditDraftV1 {
  const itemSchemaEditor = createPresetItemSchemaEditor(t)
  const schema = itemSchemaFromEditor(itemSchemaEditor)
  const levels = buildDefaultLevels(schema)
  return {
    version: PRODUCT_EDIT_DRAFT_VERSION,
    name: productName,
    itemSchemaEditor,
    levels,
    vocabItems: [createEmptyVocabItem(schema)],
  }
}

export function draftToVocabItems(draft: ProductEditDraftV1): VocabItemDraft[] {
  return draft.vocabItems.map((row) => ({
    id: row.id || crypto.randomUUID(),
    values: { ...row.values },
  }))
}
