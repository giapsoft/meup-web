import type { ItemSchemaEditorState, LevelRangeDraft } from '../types/program'
import { schemaHasLangRole } from './itemSchemaLayout'
import { itemSchemaFromEditor } from './schemaField'
import { validateSchemaAttrKeysUnique } from './schemaAttrKey'

export function validateCustomConfigSchema(editor: ItemSchemaEditorState): boolean {
  if (editor.fields.length === 0) {
    return false
  }
  if (validateSchemaAttrKeysUnique(editor.fields.map((f) => f.key)) !== null) {
    return false
  }
  return schemaHasLangRole(itemSchemaFromEditor(editor))
}

export function validateCustomConfigLevels(levels: LevelRangeDraft[]): boolean {
  if (levels.length === 0) {
    return false
  }
  for (const level of levels) {
    if (level.sides.length < 2) {
      return false
    }
    for (const side of level.sides) {
      if (side.playSteps.length < 1) {
        return false
      }
    }
  }
  return true
}
