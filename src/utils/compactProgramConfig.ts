import type { DisplayElement, ItemSchema, LevelRangeDraft, PlayStepDraft } from '../types/program'
import { langTypeIndex } from './itemSchemaLayout'
import { toCompactItemRow } from './vocabItems'
import type { VocabItemDraft } from '../types/program'

const PROGRAM_CONFIG_COMPACT_VERSION = 3

function compactFloat(v: number): number {
  if (v === Math.trunc(v)) {
    return Math.trunc(v)
  }
  return v
}

function isCompactDefault(v: unknown): boolean {
  if (typeof v === 'string') {
    return v.trim() === ''
  }
  if (typeof v === 'number') {
    return v === 0
  }
  return false
}

function trimTrailingDefaults(values: unknown[]): unknown[] {
  let end = values.length
  while (end > 0 && isCompactDefault(values[end - 1])) {
    end--
  }
  return values.slice(0, end)
}

function textAlignIndex(textAlign?: string): number {
  if (textAlign === 'center') {
    return 1
  }
  if (textAlign === 'right') {
    return 2
  }
  return 0
}

function attrTypeIndex(type: 'text' | 'text+audio'): number {
  return type === 'text+audio' ? 1 : 0
}

function marshalCompactAttr(attr: ItemSchema['attrs'][number]): unknown[] {
  return [attr.key, attrTypeIndex(attr.type), langTypeIndex(attr.langType)]
}

function marshalCompactDisplay(el: DisplayElement): unknown[] {
  const head = [
    el.attributeIndex,
    compactFloat(el.x),
    compactFloat(el.y),
    compactFloat(el.w),
    compactFloat(el.h),
  ]
  const tail = trimTrailingDefaults([
    el.color ?? '',
    el.outstandingColor ?? '',
    el.backgroundColor ?? '',
    el.backgroundOpacity ?? 0,
    el.order,
    el.maxLines ?? 0,
    textAlignIndex(el.textAlign),
    el.borderRadius ?? 0,
  ])
  return [...head, ...tail]
}

function marshalCompactPlayStep(step: PlayStepDraft): unknown[] {
  if (step.kind === 'pause') {
    const seconds = step.durationSeconds ?? 0
    return seconds > 0 ? [1, seconds] : [1]
  }
  const idx = step.attributeIndex ?? -1
  if (idx < 0) {
    return [0]
  }
  return [0, idx]
}

function marshalCompactSide(side: LevelRangeDraft['sides'][number]): unknown[] {
  return [
    side.backgroundColor,
    side.display.map(marshalCompactDisplay),
    side.playSteps.map(marshalCompactPlayStep),
  ]
}

function marshalCompactLevel(level: LevelRangeDraft): unknown[] {
  return [level.maxLvl, level.sides.map(marshalCompactSide)]
}

export function marshalCompactProgramConfig(schema: ItemSchema, levels: LevelRangeDraft[]): unknown[] {
  return [
    PROGRAM_CONFIG_COMPACT_VERSION,
    [schema.hasImage ? 1 : 0, schema.attrs.map(marshalCompactAttr)],
    levels.map(marshalCompactLevel),
  ]
}

/** JSON string for `create_product_request.payload` (`config` + `items`). */
export function toProductCreatePayloadString(
  schema: ItemSchema,
  levels: LevelRangeDraft[],
  items: VocabItemDraft[],
): string {
  return JSON.stringify({
    config: marshalCompactProgramConfig(schema, levels),
    items: items.map((item) => toCompactItemRow(schema, item)),
  })
}
