import type { DisplayElement, ItemSchema, LangType, LevelRangeDraft, SideDraft } from '../types/program'
import { randomUUID } from './id'
import {
  audioLayoutIndexForKey,
  imageLayoutIndex,
  textLayoutIndexForKey,
} from './itemSchemaLayout'
import {
  createDefaultLevel,
  createEmptySide,
  createPlayStep,
  firstTextAudioPlayIndex,
} from './programConfig'
import { imageSquareDisplayRatios } from './sideConfig'

type LayoutRole = 'study' | 'native' | 'plainText' | 'image'

type DisplayTemplate = Omit<DisplayElement, 'attributeIndex'> & {
  role: LayoutRole
  slot?: 'text' | 'audio' | 'image'
}

type SideTemplateSpec = {
  backgroundColor: string
  display: DisplayTemplate[]
  playSteps: Array<{
    kind: 'play' | 'pause'
    role?: LayoutRole
    slot?: 'text' | 'audio' | 'image'
    durationSeconds?: number
  }>
}

const PRESET_SIDE_TEMPLATES: SideTemplateSpec[] = [
  {
    backgroundColor: '#1a1a2e',
    display: [
      { role: 'image', slot: 'image', x: 0, y: 0, ...imageSquareDisplayRatios(), order: 0 },
      {
        role: 'study',
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
        role: 'plainText',
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
      { kind: 'play', role: 'study', slot: 'audio' },
      { kind: 'pause', durationSeconds: 1 },
    ],
  },
  {
    backgroundColor: '#16213e',
    display: [
      {
        role: 'native',
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
    playSteps: [{ kind: 'play', role: 'native', slot: 'audio' }],
  },
]

function attrKeyForRole(schema: ItemSchema, role: LayoutRole): string | undefined {
  if (role === 'image') {
    return undefined
  }
  if (role === 'study' || role === 'native') {
    const langType: LangType = role
    return schema.attrs.find((a) => a.langType === langType)?.key
  }
  return schema.attrs.find((a) => a.type === 'text' && !a.langType)?.key
}

function resolveLayoutIndex(
  schema: ItemSchema,
  role: LayoutRole,
  slot: 'text' | 'audio' | 'image' = 'text',
): number {
  if (slot === 'image' || role === 'image') {
    return imageLayoutIndex(schema)
  }
  const key = attrKeyForRole(schema, role)
  if (!key) {
    return -1
  }
  if (slot === 'audio') {
    return audioLayoutIndexForKey(schema, key)
  }
  return textLayoutIndexForKey(schema, key)
}

function mapDisplayTemplate(templates: DisplayTemplate[], schema: ItemSchema): DisplayElement[] {
  const out: DisplayElement[] = []
  for (const tpl of templates) {
    const attributeIndex = resolveLayoutIndex(schema, tpl.role, tpl.slot ?? 'text')
    if (attributeIndex < 0) {
      continue
    }
    const { role: _role, slot: _slot, ...rest } = tpl
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
      if (!step.role) {
        return false
      }
      return resolveLayoutIndex(schema, step.role, step.slot ?? 'audio') >= 0
    })
    .map((step) => {
      if (step.kind === 'pause') {
        return createPlayStep({
          kind: 'pause',
          durationSeconds: step.durationSeconds,
        })
      }
      const attributeIndex = resolveLayoutIndex(schema, step.role!, step.slot ?? 'audio')
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
