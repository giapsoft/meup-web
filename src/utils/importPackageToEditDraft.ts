import type { ItemSchema } from '../types/program'
import type { ExportVersionTree } from './exportVersionTree'
import { unmarshalCompactProgramConfig } from './compactProgramConfig'
import { buildDefaultLevels } from './defaultSides'
import { randomUUID } from './id'
import type { ProductEditDraft } from './productEditDraft'
import { PRODUCT_EDIT_DRAFT_VERSION } from './productEditDraft'
import { programConfigWebFromSchema } from './programConfigWeb'
import { createEmptyVocabItem, fromCompactItemRow } from './vocabItems'

export type ImportPackageTree = ExportVersionTree

/** Build editor draft state from `GET /api/product/import-package` tree payload. */
export function importTreeToEditDraft(
  tree: ImportPackageTree,
  fallbackTitle: string,
  fallbackDescription = '',
): ProductEditDraft {
  const { schema, levels: parsedLevels } = unmarshalCompactProgramConfig(tree.config)
  const levels = parsedLevels.length > 0 ? parsedLevels : buildDefaultLevels(schema)
  const itemSchemaWithLabels = mapSchemaLabelsFromCompact(schema)
  const programConfig = programConfigWebFromSchema(itemSchemaWithLabels, levels)
  const title = tree.root.name.trim() || fallbackTitle
  const vocabItems =
    tree.items.length > 0
      ? tree.items.map((row) => ({
          id: randomUUID(),
          values: fromCompactItemRow(schema, row),
        }))
      : [createEmptyVocabItem(schema)]
  return {
    version: PRODUCT_EDIT_DRAFT_VERSION,
    title,
    description: fallbackDescription,
    programConfig,
    vocabItems,
  }
}

/** Map compact attr `name` (often the key) to web `label`; preserve key for export. */
function mapSchemaLabelsFromCompact(schema: ItemSchema): ItemSchema {
  return {
    hasImage: schema.hasImage,
    attrs: schema.attrs.map((attr) => ({
      ...attr,
      name: attr.name.trim() && attr.name !== attr.key ? attr.name : attr.key,
    })),
  }
}
