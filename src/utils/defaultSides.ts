import type { DisplayElement, ItemSchemaAttribute, LevelRangeDraft, SideDraft } from '../types/program'
import {
  createDefaultLevel,
  createEmptySide,
  createPlayStep,
  indexForKey,
} from './programConfig'

type DisplayTemplate = Omit<DisplayElement, 'attributeIndex'> & { key: string }

type SideTemplateSpec = {
  backgroundColor: string
  display: DisplayTemplate[]
  playSteps: Array<{
    kind: 'play' | 'pause'
    attributeKey?: string
    durationSeconds?: number
  }>
}

const PRESET_SIDE_TEMPLATES: SideTemplateSpec[] = [
  {
    backgroundColor: '#1a1a2e',
    display: [
      { key: 'image', x: 0, y: 0, w: 1, h: 1, order: 0 },
      {
        key: 'studyText',
        x: 0.05,
        y: 0.05,
        w: 0.6,
        h: 0.5,
        color: '#FFFFFF',
        backgroundColor: '#333333AA',
        order: 1,
      },
      {
        key: 'ipa',
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
      { kind: 'play', attributeKey: 'studyTextAudio' },
      { kind: 'pause', durationSeconds: 1 },
      { kind: 'play', attributeKey: 'studyExampleAudio' },
    ],
  },
  {
    backgroundColor: '#16213e',
    display: [
      {
        key: 'studyExample',
        x: 0.05,
        y: 0.1,
        w: 0.9,
        h: 0.5,
        color: '#CCCCCC',
        outstandingColor: '#FFFFFF',
        order: 0,
      },
    ],
    playSteps: [{ kind: 'play', attributeKey: 'studyExampleAudio' }],
  },
]

function mapDisplayTemplate(
  templates: DisplayTemplate[],
  attributes: ItemSchemaAttribute[],
): DisplayElement[] {
  const out: DisplayElement[] = []
  for (const tpl of templates) {
    const attributeIndex = indexForKey(attributes, tpl.key)
    if (attributeIndex < 0) {
      continue
    }
    const { key: _key, ...rest } = tpl
    out.push({ ...rest, attributeIndex })
  }
  return out.sort((a, b) => a.order - b.order)
}

function mapSideTemplate(
  spec: SideTemplateSpec,
  attributes: ItemSchemaAttribute[],
  playOrder: number,
): SideDraft | null {
  const display = mapDisplayTemplate(spec.display, attributes)
  const playSteps = spec.playSteps
    .filter((step) => {
      if (step.kind === 'pause') {
        return true
      }
      return step.attributeKey !== undefined && indexForKey(attributes, step.attributeKey) >= 0
    })
    .map((step) =>
      createPlayStep({
        kind: step.kind,
        attributeKey: step.attributeKey,
        durationSeconds: step.durationSeconds,
      }),
    )

  if (display.length === 0 && playSteps.length === 0) {
    return null
  }

  return {
    id: crypto.randomUUID(),
    playOrder,
    backgroundColor: spec.backgroundColor,
    display,
    playSteps,
  }
}

export function buildDefaultSides(attributes: ItemSchemaAttribute[]): SideDraft[] {
  const fromPresets: SideDraft[] = []
  for (const spec of PRESET_SIDE_TEMPLATES) {
    const side = mapSideTemplate(spec, attributes, fromPresets.length + 1)
    if (side) {
      fromPresets.push(side)
    }
  }
  if (fromPresets.length > 0) {
    return fromPresets
  }
  return [createEmptySide(attributes, 1)]
}

export function buildDefaultLevels(attributes: ItemSchemaAttribute[]): LevelRangeDraft[] {
  return [createDefaultLevel(buildDefaultSides(attributes))]
}
