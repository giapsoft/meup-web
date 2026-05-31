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

export type ProgramDraft = {
  name: string
  id: string
  fields: SchemaFieldRow[]
}
