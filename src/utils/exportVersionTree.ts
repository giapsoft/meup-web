import type { ItemSchema, LevelRangeDraft, VocabItemDraft } from '../types/program'
import { marshalCompactProgramConfig } from './compactProgramConfig'
import { toCompactItemRow } from './vocabItems'

export type ExportVersionTree = {
  pair: { nativeLang: string; studyLang: string }
  config: unknown[]
  root: {
    name: string
    depth: number
    itemIndexes: number[]
    children: []
  }
  items: string[][]
}

/** Build `tree` payload for `POST /api/product/export-version`. */
export function toExportVersionTree(
  nativeLang: string,
  studyLang: string,
  productName: string,
  schema: ItemSchema,
  levels: LevelRangeDraft[],
  items: VocabItemDraft[],
): ExportVersionTree {
  const itemIndexes = items.map((_, index) => index)
  return {
    pair: { nativeLang, studyLang },
    config: marshalCompactProgramConfig(schema, levels),
    root: {
      name: productName.trim() || 'Course',
      depth: 0,
      itemIndexes,
      children: [],
    },
    items: items.map((item) => toCompactItemRow(schema, item)),
  }
}
