/**
 * Level band logic ported from meup `ConfigLevelItem.h`.
 * Storage uses breakpoint `maxLvl` only (same as meup JSON / ProgramConfig.h).
 */
import type { LevelRangeDraft, SideDraft } from '../types/program'
import type { MessageParams, TranslationKey } from '../i18n/types'
import { cloneSides } from './programConfig'

export type ConfigLevelItem = {
  from: number
  to: number
  index: number
}

const OPEN_END = -999

export function cloneLevels(levels: LevelRangeDraft[]): LevelRangeDraft[] {
  return levels.map((level) => ({
    ...level,
    sides: level.sides.map((side) => ({
      ...side,
      display: side.display.map((d) => ({ ...d })),
      playSteps: side.playSteps.map((s) => ({ ...s })),
    })),
  }))
}

/** Mirrors meup `buildConfigLevelItems`. */
export function buildConfigLevelItems(levels: LevelRangeDraft[]): ConfigLevelItem[] {
  if (levels.length === 0) {
    return []
  }
  if (levels.length === 1) {
    return [{ from: -1, to: -1, index: 0 }]
  }

  const items: ConfigLevelItem[] = []
  for (let i = 0; i < levels.length; i++) {
    const item: ConfigLevelItem = { from: -1, to: -1, index: i }
    if (i === 0) {
      item.from = 0
    } else {
      item.from = Math.max(levels[i].maxLvl, items[i - 1].from + 1)
    }
    item.to = i + 1 === levels.length ? OPEN_END : levels[i + 1].maxLvl - 1
    items.push(item)
  }
  return items
}

export function configLevelItemLabel(
  item: ConfigLevelItem,
  t: (key: TranslationKey, params?: MessageParams) => string,
): string {
  if (item.from === -1 && item.to === -1) {
    return t('createProgram.level.all')
  }
  if (item.from > -1 && item.to === OPEN_END) {
    return t('createProgram.level.above', { n: item.from - 1 })
  }
  if (item.from > -1 && item.to > -1) {
    return t('createProgram.level.fromTo', { from: item.from, to: item.to })
  }
  return ''
}

/** Mirrors meup `insertNewLevelRange`. Returns a new levels array. */
export function insertNewLevelRange(levels: LevelRangeDraft[]): LevelRangeDraft[] {
  if (levels.length === 0) {
    return [{ id: crypto.randomUUID(), maxLvl: 0, sides: [] }]
  }

  const copy = cloneLevels(levels)
  const nr: LevelRangeDraft = {
    id: crypto.randomUUID(),
    maxLvl: 0,
    sides: cloneSides(copy[copy.length - 1].sides),
  }

  if (copy.length === 1) {
    copy[0] = { ...copy[0], maxLvl: 1 }
    nr.maxLvl = copy[0].maxLvl + 1
    copy.push(nr)
    return copy
  }

  const items = buildConfigLevelItems(copy)
  const lastFrom = items[items.length - 1].from
  nr.maxLvl = lastFrom
  copy[copy.length - 1] = { ...copy[copy.length - 1], maxLvl: lastFrom + 1 }
  copy.splice(copy.length - 1, 0, nr)
  return copy
}

/** Id of the band inserted by [insertNewLevelRange] (for UI focus). */
export function insertedLevelId(
  before: LevelRangeDraft[],
  after: LevelRangeDraft[],
): string | undefined {
  if (after.length <= before.length) {
    return undefined
  }
  if (before.length === 1) {
    return after[1]?.id
  }
  return after[after.length - 2]?.id
}

export type ProgramPreviewSide = {
  side: SideDraft
  levelIndex: number
}

/** All card faces across every level band, in level order then playOrder. */
export function allProgramPreviewSides(levels: LevelRangeDraft[]): ProgramPreviewSide[] {
  const out: ProgramPreviewSide[] = []
  for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
    const sorted = [...levels[levelIndex].sides].sort((a, b) => a.playOrder - b.playOrder)
    for (const side of sorted) {
      out.push({ side, levelIndex })
    }
  }
  return out
}

/**
 * Mirrors meup `adjustLevelRangeMaxLvl`.
 * Returns a new array on success, or null if the adjustment is rejected.
 */
export function adjustLevelRangeMaxLvl(
  levels: LevelRangeDraft[],
  index: number,
  delta: number,
): LevelRangeDraft[] | null {
  if (levels.length <= 1 || index < 0 || index >= levels.length || delta === 0) {
    return null
  }

  const copy = cloneLevels(levels)
  const n = copy.length

  if (delta > 0) {
    if (index + 1 >= n) {
      return null
    }
    for (let j = index + 1; j < n; j++) {
      copy[j].maxLvl++
    }
    return copy
  }

  if (index <= 0) {
    return null
  }

  let j = index
  copy[j].maxLvl--
  while (j > 0 && copy[j].maxLvl <= copy[j - 1].maxLvl) {
    if (copy[j - 1].maxLvl <= 0) {
      return null
    }
    j--
    copy[j].maxLvl--
  }

  if (copy[0].maxLvl < 0) {
    return null
  }
  for (let k = 0; k + 1 < n; k++) {
    if (copy[k].maxLvl >= copy[k + 1].maxLvl) {
      return null
    }
  }
  return copy
}
