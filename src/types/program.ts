/** UI-facing field type — `text+audio` expands to text + audio attributes. */
export type SchemaFieldUiType = 'text' | 'image' | 'text+audio'

export type SchemaFieldRow = {
  /** Stable row id for React / drag-and-drop. */
  id: string
  /** User-facing label (maps to ItemSchema `name`). */
  name: string
  uiType: SchemaFieldUiType
  /** Auto-generated stable key; audio pair uses `{key}Audio`. */
  key: string
}

export type ItemSchemaAttribute = {
  key: string
  name: string
  type: 'text' | 'image' | 'audio'
}

export type DisplayElement = {
  attributeIndex: number
  x: number
  y: number
  w: number
  h: number
  color?: string
  outstandingColor?: string
  backgroundColor?: string
  backgroundOpacity?: number
  order: number
  maxLines?: number
  textAlign?: string
  borderRadius?: number
  /** Preview placeholder in wizard; empty falls back to attribute name. */
  label?: string
}

export type PlayStepDraft = {
  id: string
  kind: 'play' | 'pause'
  attributeKey?: string
  durationSeconds?: number
}

export type SideDraft = {
  id: string
  playOrder: number
  backgroundColor: string
  display: DisplayElement[]
  playSteps: PlayStepDraft[]
}

export type LevelRangeDraft = {
  id: string
  /** SRS breakpoint — same semantics as tach `LevelRange.maxLvl`. */
  maxLvl: number
  sides: SideDraft[]
}

export type ProgramConfigPayload = {
  id: string
  name: string
  itemSchema: { attributes: ItemSchemaAttribute[] }
  levels: Array<{
    maxLvl: number
    sides: Array<{
      backgroundColor: string
      display: DisplayElement[]
      playSteps: Array<{
        kind: 'play' | 'pause'
        attributeKey?: string
        durationSeconds?: number
      }>
    }>
  }>
}
