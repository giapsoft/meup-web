import type {
  DisplayElement,
  ItemSchema,
  LevelRangeDraft,
  PlayStepDraft,
  ProgramConfigPayload,
  ProgramExportPayload,
  SideDraft,
  VocabItemDraft,
} from '../types/program'
import { randomUUID } from './id'
import {
  audioLayoutIndexForKey,
  audioLayoutIndexes,
  displayableLayoutIndexes,
  imageLayoutIndex,
  textAudioAttrs,
} from './itemSchemaLayout'
import { toExportItems } from './vocabItems'
import type { MessageParams, TranslationKey } from '../i18n/types'

/** Matches capygo-api `DefaultLevelRangeMax` / meup `kDefaultLevelRangeMax`. */
export const DEFAULT_LEVEL_MAX = 10

export function cloneSide(side: SideDraft): SideDraft {
  return {
    ...side,
    id: randomUUID(),
    display: side.display.map((d) => ({ ...d })),
    playSteps: side.playSteps.map((s) => ({ ...s, id: randomUUID() })),
  }
}

export function cloneSides(sides: SideDraft[]): SideDraft[] {
  return sides.map(cloneSide)
}

export function normalizePlayOrder(sides: SideDraft[]): SideDraft[] {
  return sides.map((s, i) => ({ ...s, playOrder: i + 1 }))
}

export function sideNumberLabel(
  playOrder: number,
  t: (key: TranslationKey, params?: MessageParams) => string,
): string {
  return t('createProgram.side.numbered', { n: playOrder })
}

export function createDefaultLevel(sides: SideDraft[]): LevelRangeDraft {
  return {
    id: randomUUID(),
    maxLvl: DEFAULT_LEVEL_MAX,
    sides: normalizePlayOrder(sides),
  }
}

export function autoLayoutFromIndices(schema: ItemSchema, indices: number[]): DisplayElement[] {
  const ordered = indices.filter((i) => i >= 0)
  const imageIdx = imageLayoutIndex(schema)
  const imageIndices = ordered.filter((i) => i === imageIdx)
  const textIndices = ordered.filter((i) => i !== imageIdx && i < schema.attrs.length)

  const out: DisplayElement[] = []
  let order = 0

  if (imageIndices.length > 0) {
    // 1:1 in screen pixels on 240×320 card → w=1, h=240/320
    out.push({
      attributeIndex: imageIndices[0],
      x: 0,
      y: 0,
      w: 1,
      h: 240 / 320,
      order: order++,
    })
  }

  const hasImage = imageIndices.length > 0
  let y = hasImage ? 0.05 : 0.1
  for (const idx of textIndices) {
    out.push({
      attributeIndex: idx,
      x: 0.05,
      y,
      w: 0.9,
      h: hasImage ? 0.18 : 0.22,
      color: '#FFFFFF',
      backgroundColor: '#333333AA',
      order: order++,
    })
    y += hasImage ? 0.2 : 0.24
    if (y > 0.85) {
      break
    }
  }

  return out
}

export function selectedDisplayIndices(side: SideDraft): number[] {
  return [...side.display]
    .sort((a, b) => a.order - b.order)
    .map((d) => d.attributeIndex)
}

export function applyDisplaySelection(
  side: SideDraft,
  indices: number[],
  schema: ItemSchema,
): SideDraft {
  return {
    ...side,
    display: autoLayoutFromIndices(schema, indices),
  }
}

export function createPlayStep(partial: Partial<PlayStepDraft> & Pick<PlayStepDraft, 'kind'>): PlayStepDraft {
  return {
    id: randomUUID(),
    attributeIndex: partial.attributeIndex,
    durationSeconds: partial.durationSeconds,
    kind: partial.kind,
  }
}

export function suggestPlaySteps(schema: ItemSchema): PlayStepDraft[] {
  const audio = audioLayoutIndexes(schema)
  if (audio.length === 0) {
    return []
  }
  return [createPlayStep({ kind: 'play', attributeIndex: audio[0] })]
}

export function createEmptySide(schema: ItemSchema, playOrder: number): SideDraft {
  const displayable = displayableLayoutIndexes(schema)
  const indices = displayable.slice(0, Math.min(3, displayable.length))
  return {
    id: randomUUID(),
    playOrder,
    backgroundColor: '#1a1a2e',
    display: autoLayoutFromIndices(schema, indices),
    playSteps: suggestPlaySteps(schema),
  }
}

function mapLevelsToPayload(levels: LevelRangeDraft[]) {
  return levels.map((level) => ({
    maxLvl: level.maxLvl,
    sides: level.sides.map((side) => ({
      backgroundColor: side.backgroundColor,
      display: side.display,
      playSteps: side.playSteps.map((step) => {
        if (step.kind === 'pause') {
          return {
            kind: 'pause' as const,
            durationSeconds: step.durationSeconds ?? 1,
          }
        }
        return {
          kind: 'play' as const,
          attributeIndex: step.attributeIndex ?? -1,
        }
      }),
    })),
  }))
}

export function toProgramConfigPayload(
  id: string,
  name: string,
  itemSchema: ItemSchema,
  levels: LevelRangeDraft[],
): ProgramConfigPayload {
  return {
    id,
    name,
    itemSchema,
    levels: mapLevelsToPayload(levels),
  }
}

export function toProgramExportPayload(
  id: string,
  name: string,
  itemSchema: ItemSchema,
  levels: LevelRangeDraft[],
  items: VocabItemDraft[],
): ProgramExportPayload {
  return {
    ...toProgramConfigPayload(id, name, itemSchema, levels),
    items: toExportItems(itemSchema, items),
  }
}

/** First text+audio column audio layout index (for default side templates). */
export function firstTextAudioPlayIndex(schema: ItemSchema): number | undefined {
  const first = textAudioAttrs(schema)[0]
  if (!first) {
    return undefined
  }
  const idx = audioLayoutIndexForKey(schema, first.key)
  return idx >= 0 ? idx : undefined
}
