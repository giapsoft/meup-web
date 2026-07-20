import type { ItemSchemaEditorState, LevelRangeDraft } from '../types/program'
import type { ProgramConfigWeb } from '../types/webConfig'
import { buildDefaultLevels } from './defaultSides'
import { randomUUID } from './id'
import { itemSchemaFromEditor } from './schemaField'

/** Convert API `ProgramConfigWeb` into wizard editor state. */
export function editorStateFromWebConfig(config: ProgramConfigWeb): {
  itemSchemaEditor: ItemSchemaEditorState
  levels: LevelRangeDraft[]
} {
  const itemSchemaEditor: ItemSchemaEditorState = {
    hasImage: config.itemSchema.hasImage,
    fields: config.itemSchema.attrs.map((attr) => ({
      id: randomUUID(),
      key: attr.key.trim(),
      description: attr.description ?? '',
      uiType: attr.type === 'text+audio' ? 'text+audio' : 'text',
      langType:
        attr.langType === 'native' || attr.langType === 'study' ? attr.langType : undefined,
    })),
  }

  const schema = itemSchemaFromEditor(itemSchemaEditor)
  const levels: LevelRangeDraft[] =
    config.levels.length > 0
      ? config.levels.map((level) => ({
          id: randomUUID(),
          maxLvl: level.maxLvl,
          sides: level.sides.map((side, sideIndex) => ({
            id: randomUUID(),
            playOrder: sideIndex + 1,
            backgroundColor: side.backgroundColor,
            display: side.display.map((el) => ({ ...el })),
            playSteps: side.playSteps.map((step) => ({
              id: randomUUID(),
              kind: step.kind,
              attributeIndex: step.attributeIndex,
              durationSeconds: step.durationSeconds,
            })),
          })),
        }))
      : buildDefaultLevels(schema)

  return { itemSchemaEditor, levels }
}
