import type { ItemSchema, LevelRangeDraft } from '../types/program'
import type { ProgramConfigWeb } from '../types/webConfig'

/** Map wizard/API item schema + levels to `ProgramConfigWeb` for create request body. */
export function programConfigWebFromSchema(
  schema: ItemSchema,
  levels: LevelRangeDraft[],
): ProgramConfigWeb {
  return {
    itemSchema: {
      hasImage: schema.hasImage,
      attrs: schema.attrs.map((attr) => ({
        key: attr.key,
        label: attr.name,
        type: attr.type,
        ...(attr.langType ? { langType: attr.langType } : {}),
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
