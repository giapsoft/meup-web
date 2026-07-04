import type { DisplayElement, ItemSchema, LevelRangeDraft, SideDraft } from '../types/program'
import { randomUUID } from './id'
import {
  imageLayoutIndex,
  layoutIndexForAttrKey,
} from './itemSchemaLayout'
import {
  createDefaultLevel,
  createEmptySide,
  createPlayStep,
  firstTextAudioPlayIndex,
} from './programConfig'

type DisplayTemplate = Omit<DisplayElement, 'attributeIndex'> & { layoutKey: string; slot?: 'text' | 'audio' | 'image' }

type SideTemplateSpec = {
  backgroundColor: string
  display: DisplayTemplate[]
  playSteps: Array<{
    kind: 'play' | 'pause'
    layoutKey?: string
    slot?: 'text' | 'audio' | 'image'
    durationSeconds?: number
  }>
}

const PRESET_SIDE_TEMPLATES: SideTemplateSpec[] = [
  {
    backgroundColor: '#1a1a2e',
    display: [
      { layoutKey: 'image', slot: 'image', x: 0, y: 0, w: 1, h: 1, order: 0 },
      {
        layoutKey: 'studyText',
        slot: 'text',
        x: 0.05,
        y: 0.05,
        w: 0.6,
        h: 0.5,
        color: '#FFFFFF',
        backgroundColor: '#333333AA',
        order: 1,
      },
      {
        layoutKey: 'ipa',
        slot: 'text',
        x: 0.05,
        y: 0.6,
        w: 0.9,
        h: 0.15,
        color: '#AAAAAA',
        backgroundColor: '#2d2d4499',
        order: 2,
      },
    ],
    playSteps: [
      { kind: 'play', layoutKey: 'studyText', slot: 'audio' },
      { kind: 'pause', durationSeconds: 1 },
    ],
  },
  {
    backgroundColor: '#16213e',
    display: [
      {
        layoutKey: 'nativeText',
        slot: 'text',
        x: 0.05,
        y: 0.1,
        w: 0.9,
        h: 0.5,
        color: '#CCCCCC',
        outstandingColor: '#FFFFFF',
        order: 0,
      },
    ],
    playSteps: [{ kind: 'play', layoutKey: 'nativeText', slot: 'audio' }],
  },
]

function resolveLayoutIndex(
  schema: ItemSchema,
  layoutKey: string,
  slot: 'text' | 'audio' | 'image' = 'text',
): number {
  if (slot === 'image' || layoutKey === 'image') {
    return imageLayoutIndex(schema)
  }
  return layoutIndexForAttrKey(schema, layoutKey, slot)
}

function mapDisplayTemplate(templates: DisplayTemplate[], schema: ItemSchema): DisplayElement[] {
  const out: DisplayElement[] = []
  for (const tpl of templates) {
    const attributeIndex = resolveLayoutIndex(schema, tpl.layoutKey, tpl.slot ?? 'text')
    if (attributeIndex < 0) {
      continue
    }
    const { layoutKey: _layoutKey, slot: _slot, ...rest } = tpl
    out.push({ ...rest, attributeIndex })
  }
  return out.sort((a, b) => a.order - b.order)
}

function mapSideTemplate(
  spec: SideTemplateSpec,
  schema: ItemSchema,
  playOrder: number,
): SideDraft | null {
  const display = mapDisplayTemplate(spec.display, schema)
  const playSteps = spec.playSteps
    .filter((step) => {
      if (step.kind === 'pause') {
        return true
      }
      if (!step.layoutKey) {
        return false
      }
      return resolveLayoutIndex(schema, step.layoutKey, step.slot ?? 'audio') >= 0
    })
    .map((step) => {
      if (step.kind === 'pause') {
        return createPlayStep({
          kind: 'pause',
          durationSeconds: step.durationSeconds,
        })
      }
      const attributeIndex = resolveLayoutIndex(schema, step.layoutKey!, step.slot ?? 'audio')
      return createPlayStep({ kind: 'play', attributeIndex })
    })

  if (display.length === 0 && playSteps.length === 0) {
    return null
  }

  return {
    id: randomUUID(),
    playOrder,
    backgroundColor: spec.backgroundColor,
    display,
    playSteps,
  }
}

export function buildDefaultSides(schema: ItemSchema): SideDraft[] {
  const fromPresets: SideDraft[] = []
  for (const spec of PRESET_SIDE_TEMPLATES) {
    const side = mapSideTemplate(spec, schema, fromPresets.length + 1)
    if (side) {
      fromPresets.push(side)
    }
  }
  if (fromPresets.length > 0) {
    return fromPresets
  }
  const fallback = createEmptySide(schema, 1)
  const audioIdx = firstTextAudioPlayIndex(schema)
  if (audioIdx !== undefined && fallback.playSteps.length === 0) {
    fallback.playSteps = [createPlayStep({ kind: 'play', attributeIndex: audioIdx })]
  }
  return [fallback]
}

export function buildDefaultLevels(schema: ItemSchema): LevelRangeDraft[] {
  return [createDefaultLevel(buildDefaultSides(schema))]
}
