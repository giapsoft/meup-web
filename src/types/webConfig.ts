import type { DisplayElement } from './program'

export type SchemaAttrWeb = {
  key: string
  description?: string
  type: string
  langType?: string
}

export type PlayStepWeb = {
  kind: 'play' | 'pause'
  attributeIndex?: number
  durationSeconds?: number
}

export type SideWeb = {
  backgroundColor: string
  display: DisplayElement[]
  playSteps: PlayStepWeb[]
}

export type LevelWeb = {
  maxLvl: number
  sides: SideWeb[]
}

export type ProgramConfigWeb = {
  itemSchema: {
    hasImage: boolean
    attrs: SchemaAttrWeb[]
  }
  levels: LevelWeb[]
}

export type WebConfig = {
  defaultConfig: ProgramConfigWeb
  vocabPrice: number
  audioPrice: number
  imagePrice: number
  descriptionPrice: number
  itemMinCount: number
  itemMaxCount: number
}
