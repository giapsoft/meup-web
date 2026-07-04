import type { ItemSchemaEditorState, LevelRangeDraft } from '../types/program'
import type { ProgramConfigWeb } from '../types/webConfig'
import { generateSchemaKey } from './schemaField'

/** Build `ProgramConfigWeb` from wizard editor state (for create request `config`). */
export function programConfigWebFromEditor(
  editor: ItemSchemaEditorState,
  levels: LevelRangeDraft[],
): ProgramConfigWeb {
  return {
    itemSchema: {
      hasImage: editor.hasImage,
      attrs: editor.fields.map((row) => ({
        key: row.key.trim() || generateSchemaKey(),
        label: row.label.trim(),
        ...(row.description?.trim() ? { description: row.description.trim() } : {}),
        type: row.uiType,
        ...(row.langType ? { langType: row.langType } : {}),
      })),
    },
    levels: levels.map((level) => ({
      maxLvl: level.maxLvl,
      sides: level.sides.map((side) => ({
        backgroundColor: side.backgroundColor,
        display: side.display.map((el) => ({
          attributeIndex: el.attributeIndex,
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
          order: el.order,
          ...(el.color ? { color: el.color } : {}),
          ...(el.outstandingColor ? { outstandingColor: el.outstandingColor } : {}),
          ...(el.backgroundColor ? { backgroundColor: el.backgroundColor } : {}),
          ...(el.backgroundOpacity !== undefined ? { backgroundOpacity: el.backgroundOpacity } : {}),
          ...(el.maxLines !== undefined ? { maxLines: el.maxLines } : {}),
          ...(el.textAlign ? { textAlign: el.textAlign } : {}),
          ...(el.borderRadius !== undefined ? { borderRadius: el.borderRadius } : {}),
        })),
        playSteps: side.playSteps.map((step) => ({
          kind: step.kind,
          ...(step.attributeIndex !== undefined ? { attributeIndex: step.attributeIndex } : {}),
          ...(step.durationSeconds !== undefined ? { durationSeconds: step.durationSeconds } : {}),
        })),
      })),
    })),
  }
}

/** @deprecated Prefer programConfigWebFromEditor when editor state is available. */
export function programConfigWebFromSchema(
  schema: import('../types/program').ItemSchema,
  levels: LevelRangeDraft[],
): ProgramConfigWeb {
  return programConfigWebFromEditor(
    {
      hasImage: schema.hasImage,
      fields: schema.attrs.map((attr) => ({
        id: '',
        label: attr.name,
        description: attr.description,
        uiType: attr.type === 'text+audio' ? 'text+audio' : 'text',
        key: attr.key,
        langType: attr.langType,
      })),
    },
    levels,
  )
}
