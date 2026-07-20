import type { DisplayElement, ItemSchema, LevelRangeDraft, PlayStepDraft } from '../types/program'
import { randomUUID } from './id'
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

function asNumber(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  throw new Error(`invalid ${label}`)
}

function asString(value: unknown, _label: string): string {
  if (typeof value === 'string') {
    return value
  }
  if (value == null) {
    return ''
  }
  return String(value)
}

function textAlignFromIndex(index: number): string | undefined {
  if (index === 1) {
    return 'center'
  }
  if (index === 2) {
    return 'right'
  }
  return index === 0 ? 'left' : undefined
}

function langTypeFromIndex(index: number): ItemSchema['attrs'][number]['langType'] {
  if (index === 1) {
    return 'native'
  }
  if (index === 2) {
    return 'study'
  }
  return undefined
}

function attrTypeFromIndex(index: number): 'text' | 'text+audio' {
  return index === 1 ? 'text+audio' : 'text'
}

function unmarshalCompactAttr(row: unknown): ItemSchema['attrs'][number] {
  if (!Array.isArray(row) || row.length < 3) {
    throw new Error('invalid compact attribute')
  }
  const key = asString(row[0], 'attribute key')
  const type = attrTypeFromIndex(asNumber(row[1], 'attribute type'))
  const langType = langTypeFromIndex(asNumber(row[2], 'attribute langType'))
  return { key, name: key, type, langType }
}

function unmarshalCompactDisplay(row: unknown): DisplayElement {
  if (!Array.isArray(row) || row.length < 5) {
    throw new Error('invalid compact display')
  }
  const tail = [row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12]]
  return {
    attributeIndex: asNumber(row[0], 'display attributeIndex'),
    x: asNumber(row[1], 'display x'),
    y: asNumber(row[2], 'display y'),
    w: asNumber(row[3], 'display w'),
    h: asNumber(row[4], 'display h'),
    color: asString(tail[0], 'display color') || undefined,
    outstandingColor: asString(tail[1], 'display outstandingColor') || undefined,
    backgroundColor: asString(tail[2], 'display backgroundColor') || undefined,
    // Keep 0 — it means fully transparent; `|| undefined` would drop it and preview
    // would fall back to color alpha (background reappears after reload).
    backgroundOpacity: asNumber(tail[3] ?? 0, 'display backgroundOpacity'),
    order: asNumber(tail[4] ?? 0, 'display order'),
    maxLines: asNumber(tail[5] ?? 0, 'display maxLines') || undefined,
    textAlign: textAlignFromIndex(asNumber(tail[6] ?? 0, 'display textAlign')),
    borderRadius: asNumber(tail[7] ?? 0, 'display borderRadius') || undefined,
  }
}

function unmarshalCompactPlayStep(row: unknown): PlayStepDraft {
  if (!Array.isArray(row) || row.length === 0) {
    throw new Error('invalid compact playStep')
  }
  const kindCode = asNumber(row[0], 'playStep kind')
  if (kindCode === 1) {
    return {
      id: randomUUID(),
      kind: 'pause',
      durationSeconds: row.length > 1 ? asNumber(row[1], 'playStep durationSeconds') : undefined,
    }
  }
  return {
    id: randomUUID(),
    kind: 'play',
    attributeIndex: row.length > 1 ? asNumber(row[1], 'playStep attributeIndex') : undefined,
    durationSeconds: row.length > 2 ? asNumber(row[2], 'playStep durationSeconds') : undefined,
  }
}

function unmarshalCompactSide(row: unknown, playOrder: number): LevelRangeDraft['sides'][number] {
  if (!Array.isArray(row) || row.length < 3) {
    throw new Error('invalid compact side')
  }
  const displayRaw = row[1]
  const playStepsRaw = row[2]
  return {
    id: randomUUID(),
    playOrder,
    backgroundColor: asString(row[0], 'side backgroundColor'),
    display: Array.isArray(displayRaw) ? displayRaw.map(unmarshalCompactDisplay) : [],
    playSteps: Array.isArray(playStepsRaw) ? playStepsRaw.map(unmarshalCompactPlayStep) : [],
  }
}

function unmarshalCompactLevel(row: unknown): LevelRangeDraft {
  if (!Array.isArray(row) || row.length < 2) {
    throw new Error('invalid compact level')
  }
  const sidesRaw = row[1]
  const sides = Array.isArray(sidesRaw)
    ? sidesRaw.map((side, index) => unmarshalCompactSide(side, index + 1))
    : []
  return {
    id: randomUUID(),
    maxLvl: asNumber(row[0], 'level maxLvl'),
    sides,
  }
}

function unmarshalCompactItemSchema(row: unknown): ItemSchema {
  if (!Array.isArray(row) || row.length < 2) {
    throw new Error('invalid compact itemSchema')
  }
  const hasImage = asNumber(row[0], 'itemSchema hasImage') !== 0
  const attrsRaw = row[1]
  const attrs = Array.isArray(attrsRaw) ? attrsRaw.map(unmarshalCompactAttr) : []
  return { hasImage, attrs }
}

/** Decode compact program config v3 into editor schema + levels. */
export function unmarshalCompactProgramConfig(raw: unknown): {
  schema: ItemSchema
  levels: LevelRangeDraft[]
} {
  if (!Array.isArray(raw) || raw.length < 3) {
    throw new Error('invalid compact program config')
  }
  const version = asNumber(raw[0], 'program config version')
  if (version !== PROGRAM_CONFIG_COMPACT_VERSION) {
    throw new Error(`unsupported compact program config version ${version}`)
  }
  const schema = unmarshalCompactItemSchema(raw[1])
  const levelsRaw = raw[2]
  const levels = Array.isArray(levelsRaw) ? levelsRaw.map(unmarshalCompactLevel) : []
  return { schema, levels }
}
