/** Wizard editor state — maps 1:1 to API itemSchema `[hasImage, attrs]`. */
export type ItemSchemaEditorState = {
  hasImage: boolean
  fields: SchemaFieldRow[]
}

export type SchemaFieldUiType = 'text' | 'text+audio'

export type LangType = 'native' | 'study'

export type SchemaFieldRow = {
  /** Stable row id for React / drag-and-drop. */
  id: string
  /** User-facing label. */
  name: string
  uiType: SchemaFieldUiType
  /** Auto-generated stable key. */
  key: string
  /** Preset fields only — required for API validate (≥1 native or study). */
  langType?: LangType
}

export type SchemaAttrType = 'text' | 'text+audio'

/** One logical column in API itemSchema (no separate image/audio attrs). */
export type SchemaAttr = {
  key: string
  name: string
  type: SchemaAttrType
  langType?: LangType
}

/** API-aligned item schema: optional image slot + text columns. */
export type ItemSchema = {
  hasImage: boolean
  attrs: SchemaAttr[]
}

/** Fixed media key for the single image slot (matches meup-api `imageKey`). */
export const IMAGE_MEDIA_KEY = 'image'

export type DisplayElement = {
  /** Layout index — text cols, derived audio cols, then image slot. */
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
  /** Preview placeholder in wizard; empty falls back to slot label. */
  label?: string
}

export type PlayStepDraft = {
  id: string
  kind: 'play' | 'pause'
  /** Layout index of an audio slot (API compact playStep). */
  attributeIndex?: number
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
  /** SRS breakpoint — same semantics as meup `LevelRange.maxLvl`. */
  maxLvl: number
  sides: SideDraft[]
}

export type ProgramConfigPayload = {
  id: string
  name: string
  itemSchema: ItemSchema
  levels: Array<{
    maxLvl: number
    sides: Array<{
      backgroundColor: string
      display: DisplayElement[]
      playSteps: Array<{
        kind: 'play' | 'pause'
        attributeIndex?: number
        durationSeconds?: number
      }>
    }>
  }>
}

/** Local file staged for preview — replaced by server resource id after upload. */
export type VocabMediaFile = {
  file: File
  objectUrl: string
  /** Placeholder 32-char id for mock export until API assigns real resource id. */
  localResourceId: string
}

/** One vocabulary row — text values keyed by `SchemaAttr.key`. */
export type VocabItemDraft = {
  id: string
  values: Record<string, string>
  media?: Record<string, VocabMediaFile>
}

export type VocabMediaExportMeta = {
  fileName: string
  mimeType: string
  size: number
  localResourceId: string
}

export type ProgramExportPayload = ProgramConfigPayload & {
  items: Array<{
    values: Record<string, string>
    mediaFiles?: Record<string, VocabMediaExportMeta>
  }>
}
