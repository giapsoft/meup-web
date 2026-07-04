import type { ItemSchema, ItemSchemaEditorState } from '../types/program'
import type { ExportVersionTree } from './exportVersionTree'
import { unmarshalCompactProgramConfig } from './compactProgramConfig'
import { buildDefaultLevels } from './defaultSides'
import { randomUUID } from './id'
import type { ProductEditDraftV1 } from './productEditDraft'
import { PRODUCT_EDIT_DRAFT_VERSION } from './productEditDraft'
import { createEmptyVocabItem, fromCompactItemRow } from './vocabItems'

export type ImportPackageTree = ExportVersionTree

function itemSchemaEditorFromSchema(schema: ItemSchema): ItemSchemaEditorState {
  return {
    hasImage: schema.hasImage,
    fields: schema.attrs.map((attr) => ({
      id: randomUUID(),
      name: attr.name.trim() || attr.key,
      uiType: attr.type === 'text+audio' ? 'text+audio' : 'text',
      key: attr.key,
      langType: attr.langType,
    })),
  }
}

/** Build editor draft state from `GET /api/product/import-package` tree payload. */
export function importTreeToEditDraft(
  tree: ImportPackageTree,
  fallbackName: string,
): ProductEditDraftV1 {
  const { schema, levels: parsedLevels } = unmarshalCompactProgramConfig(tree.config)
  const itemSchemaEditor = itemSchemaEditorFromSchema(schema)
  const levels = parsedLevels.length > 0 ? parsedLevels : buildDefaultLevels(schema)
  const name = tree.root.name.trim() || fallbackName
  const vocabItems =
    tree.items.length > 0
      ? tree.items.map((row) => ({
          id: randomUUID(),
          values: fromCompactItemRow(schema, row),
        }))
      : [createEmptyVocabItem(schema)]
  return {
    version: PRODUCT_EDIT_DRAFT_VERSION,
    name,
    itemSchemaEditor,
    levels,
    vocabItems,
  }
}
