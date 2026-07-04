import type { ItemSchemaEditorState, LevelRangeDraft, StagedServerMedia, VocabItemDraft } from '../types/program'
import type { ProgramConfigWeb } from '../types/webConfig'
import { editorStateFromWebConfig } from './customConfigState'
import { buildDefaultLevels } from './defaultSides'
import { randomUUID } from './id'
import { itemSchemaFromWebConfig, programConfigWebFromEditor } from './programConfigWeb'
import { createPresetItemSchemaEditor, itemSchemaFromEditor } from './schemaField'
import { createEmptyVocabItem } from './vocabItems'

export const PRODUCT_EDIT_DRAFT_VERSION = 2

/** @deprecated v1 — migrated on read. */
export type ProductEditDraftV1 = {
  version: 1
  name: string
  itemSchemaEditor: ItemSchemaEditorState
  levels: LevelRangeDraft[]
  vocabItems: Array<{
    id: string
    values: Record<string, string>
  }>
  savedAt?: string
}

export type ProductEditDraftVocabRow = {
  id: string
  values: Record<string, string>
  serverMedia?: Record<string, StagedServerMedia>
}

/** Serializable editor state stored in `product.draft_data`. */
export type ProductEditDraft = {
  version: typeof PRODUCT_EDIT_DRAFT_VERSION
  title: string
  description?: string
  programConfig: ProgramConfigWeb
  vocabItems: ProductEditDraftVocabRow[]
  savedAt?: string
}

export type ParsedProductEditDraft =
  | { ok: true; draft: ProductEditDraft }
  | { ok: false; reason: 'empty' | 'invalid' }

/** Migrate legacy draft fields (`name` → `label`). */
function normalizeItemSchemaEditor(editor: ItemSchemaEditorState): ItemSchemaEditorState {
  return {
    ...editor,
    fields: editor.fields.map((field) => {
      const legacy = field as (typeof field) & { name?: string }
      return {
        ...field,
        label: field.label ?? legacy.name ?? '',
        description: field.description ?? '',
      }
    }),
  }
}

function migrateV1Draft(v1: ProductEditDraftV1): ProductEditDraft {
  const itemSchemaEditor = normalizeItemSchemaEditor(v1.itemSchemaEditor)
  return {
    version: PRODUCT_EDIT_DRAFT_VERSION,
    title: v1.name,
    description: '',
    programConfig: programConfigWebFromEditor(itemSchemaEditor, v1.levels),
    vocabItems: v1.vocabItems.map((row) => ({
      id: row.id,
      values: { ...row.values },
    })),
    savedAt: v1.savedAt,
  }
}

export function serializeProductEditDraft(draft: ProductEditDraft): string {
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
    const parsed = JSON.parse(trimmed) as Partial<ProductEditDraft> & Partial<ProductEditDraftV1>
    if (parsed.version === 1 && typeof parsed.name === 'string' && parsed.itemSchemaEditor && Array.isArray(parsed.levels)) {
      return {
        ok: true,
        draft: migrateV1Draft({
          version: 1,
          name: parsed.name,
          itemSchemaEditor: parsed.itemSchemaEditor,
          levels: parsed.levels,
          vocabItems: Array.isArray(parsed.vocabItems) ? parsed.vocabItems : [],
          savedAt: parsed.savedAt,
        }),
      }
    }
    if (
      parsed.version === PRODUCT_EDIT_DRAFT_VERSION &&
      typeof parsed.title === 'string' &&
      parsed.programConfig &&
      Array.isArray(parsed.vocabItems)
    ) {
      return {
        ok: true,
        draft: {
          version: PRODUCT_EDIT_DRAFT_VERSION,
          title: parsed.title,
          description: typeof parsed.description === 'string' ? parsed.description : '',
          programConfig: parsed.programConfig,
          vocabItems: parsed.vocabItems.map((row) => ({
            id: row.id || randomUUID(),
            values: { ...(row.values ?? {}) },
            ...(row.serverMedia ? { serverMedia: { ...row.serverMedia } } : {}),
          })),
          savedAt: parsed.savedAt,
        },
      }
    }
    return { ok: false, reason: 'invalid' }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

export function createDefaultEditDraft(
  productTitle: string,
  productDescription: string,
  t: (key: import('../i18n/types').TranslationKey) => string,
): ProductEditDraft {
  const itemSchemaEditor = createPresetItemSchemaEditor(t)
  const schema = itemSchemaFromEditor(itemSchemaEditor)
  const levels = buildDefaultLevels(schema)
  return {
    version: PRODUCT_EDIT_DRAFT_VERSION,
    title: productTitle,
    description: productDescription,
    programConfig: programConfigWebFromEditor(itemSchemaEditor, levels),
    vocabItems: [createEmptyVocabItem(schema)],
  }
}

export function draftToVocabItems(draft: ProductEditDraft): VocabItemDraft[] {
  return draft.vocabItems.map((row) => ({
    id: row.id || randomUUID(),
    values: { ...row.values },
    ...(row.serverMedia ? { serverMedia: { ...row.serverMedia } } : {}),
  }))
}

export function vocabItemsToDraftRows(items: VocabItemDraft[]): ProductEditDraftVocabRow[] {
  return items.map((item) => ({
    id: item.id,
    values: { ...item.values },
    ...(item.serverMedia && Object.keys(item.serverMedia).length > 0
      ? { serverMedia: { ...item.serverMedia } }
      : {}),
  }))
}

export function editDraftLevels(draft: ProductEditDraft): LevelRangeDraft[] {
  return editorStateFromWebConfig(draft.programConfig).levels
}

export function editDraftSchema(draft: ProductEditDraft) {
  return itemSchemaFromWebConfig(draft.programConfig)
}
