import type {
  DisplayElement,
  ItemSchemaAttribute,
  LevelRangeDraft,
  PlayStepDraft,
  ProgramConfigPayload,
  ProgramExportPayload,
  SideDraft,
  VocabItemDraft,
} from '../types/program'
import { toExportItems } from './vocabItems'
import type { MessageParams, TranslationKey } from '../i18n/types'

/** Matches capygo-api `DefaultLevelRangeMax` / meup `kDefaultLevelRangeMax`. */
export const DEFAULT_LEVEL_MAX = 10

export function indexForKey(attributes: ItemSchemaAttribute[], key: string): number {
  return attributes.findIndex((a) => a.key === key)
}

export function audioKeys(attributes: ItemSchemaAttribute[]): string[] {
  return attributes.filter((a) => a.type === 'audio').map((a) => a.key)
}

export function displayableAttributes(
  attributes: ItemSchemaAttribute[],
): Array<{ index: number; attr: ItemSchemaAttribute }> {
  return attributes
    .map((attr, index) => ({ index, attr }))
    .filter(({ attr }) => attr.type === 'text' || attr.type === 'image')
}

export function cloneSide(side: SideDraft): SideDraft {
  return {
    ...side,
    id: crypto.randomUUID(),
    display: side.display.map((d) => ({ ...d })),
    playSteps: side.playSteps.map((s) => ({ ...s, id: crypto.randomUUID() })),
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
    id: crypto.randomUUID(),
    maxLvl: DEFAULT_LEVEL_MAX,
    sides: normalizePlayOrder(sides),
  }
}

export function autoLayoutFromIndices(
  indices: number[],
  attributes: ItemSchemaAttribute[],
): DisplayElement[] {
  const ordered = indices.filter((i) => i >= 0 && i < attributes.length)
  const imageIndices = ordered.filter((i) => attributes[i].type === 'image')
  const textIndices = ordered.filter((i) => attributes[i].type === 'text')

  const out: DisplayElement[] = []
  let order = 0

  if (imageIndices.length > 0) {
    out.push({
      attributeIndex: imageIndices[0],
      x: 0,
      y: 0,
      w: 1,
      h: 1,
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
  attributes: ItemSchemaAttribute[],
): SideDraft {
  return {
    ...side,
    display: autoLayoutFromIndices(indices, attributes),
  }
}

export function createPlayStep(partial: Partial<PlayStepDraft> & Pick<PlayStepDraft, 'kind'>): PlayStepDraft {
  return {
    id: crypto.randomUUID(),
    attributeKey: partial.attributeKey,
    durationSeconds: partial.durationSeconds,
    kind: partial.kind,
  }
}

export function suggestPlaySteps(attributes: ItemSchemaAttribute[]): PlayStepDraft[] {
  const keys = audioKeys(attributes)
  if (keys.length === 0) {
    return []
  }
  return [createPlayStep({ kind: 'play', attributeKey: keys[0] })]
}

export function createEmptySide(attributes: ItemSchemaAttribute[], playOrder: number): SideDraft {
  const displayable = displayableAttributes(attributes)
  const indices = displayable.slice(0, Math.min(3, displayable.length)).map(({ index }) => index)
  return {
    id: crypto.randomUUID(),
    playOrder,
    backgroundColor: '#1a1a2e',
    display: autoLayoutFromIndices(indices, attributes),
    playSteps: suggestPlaySteps(attributes),
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
          attributeKey: step.attributeKey ?? '',
        }
      }),
    })),
  }))
}

export function toProgramConfigPayload(
  id: string,
  name: string,
  attributes: ItemSchemaAttribute[],
  levels: LevelRangeDraft[],
): ProgramConfigPayload {
  return {
    id,
    name,
    itemSchema: { attributes },
    levels: mapLevelsToPayload(levels),
  }
}

export function toProgramExportPayload(
  id: string,
  name: string,
  attributes: ItemSchemaAttribute[],
  levels: LevelRangeDraft[],
  items: VocabItemDraft[],
): ProgramExportPayload {
  return {
    ...toProgramConfigPayload(id, name, attributes, levels),
    items: toExportItems(items),
  }
}
