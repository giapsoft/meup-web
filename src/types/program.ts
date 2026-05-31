/** UI-facing field type — `text+audio` expands to text + audio attributes. */
export type SchemaFieldUiType = 'text' | 'image' | 'text+audio'

export type SchemaFieldRow = {
  id: string
  label: string
  uiType: SchemaFieldUiType
  /** Stable attribute key for text/image; audio uses `{keyBase}Audio`. */
  keyBase: string
}

export type ItemSchemaAttribute = {
  key: string
  type: 'text' | 'image' | 'audio'
}

export type ProgramDraft = {
  name: string
  id: string
  fields: SchemaFieldRow[]
}
