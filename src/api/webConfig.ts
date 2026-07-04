import { API_WEB_CONFIG } from '../config'
import { apiRequest } from './client'
import type { ProgramConfigWeb } from '../types/webConfig'

export type WebConfigDto = {
  defaultConfig: ProgramConfigWeb
  vocabPrice: number
  audioPrice: number
  imagePrice: number
  descriptionPrice: number
  itemMinCount: number
  itemMaxCount: number
}

export async function fetchWebConfig(): Promise<WebConfigDto> {
  return apiRequest<WebConfigDto>(API_WEB_CONFIG)
}
