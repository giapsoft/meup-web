import { API_PRODUCT_CREATE, API_PRODUCT_CREATE_PROGRESS } from '../config'
import type { ProgramConfigWeb, SchemaAttrWeb } from '../types/webConfig'
import { apiRequest } from './client'

export type ManualItem = {
  values: Record<string, string>
}

type CreateProductRequestShared = {
  description?: string
  nativeLangId: string
  studyLangId: string
  config?: ProgramConfigWeb | null
}

export type CreateProductRequestTitle = CreateProductRequestShared & {
  type: 'title'
  title: string
  count: number
}

export type CreateProductRequestImage = CreateProductRequestShared & {
  type: 'image'
  title?: string
  imageBase64: string
  count: number
}

export type CreateProductRequestParagraph = CreateProductRequestShared & {
  type: 'paragraph'
  title?: string
  paragraph: string
  count: number
}

export type CreateProductRequestManual = CreateProductRequestShared & {
  type: 'manual'
  title: string
  tempId: string
  items: ManualItem[]
  generateMediaForMissingItems: boolean
}

export type CreateProductRequestBody =
  | CreateProductRequestTitle
  | CreateProductRequestImage
  | CreateProductRequestParagraph
  | CreateProductRequestManual

export type CreateProductRequestDto = {
  id: string
  ownerId: string
  productName: string
  productDescription: string
  payload: string
  nativeLangId: string
  studyLangId: string
  status: string
  totalCredits: number
  jobs: Array<{
    id: string
    type: string
    content: string
    limitCount: number
    status: string
    updatedAt: string
  }>
  createdAt: string
  updatedAt: string
}

export type ProductCreateProgressDto = {
  requestId: string
  status: string
  progressPercent?: number
  jobs?: {
    total: number
    pending: number
    working: number
    success: number
    failed: number
  }
}

export async function createProductRequest(body: CreateProductRequestBody): Promise<CreateProductRequestDto> {
  return apiRequest<CreateProductRequestDto>(API_PRODUCT_CREATE, {
    method: 'POST',
    body,
  })
}

export async function getProductCreateProgress(requestId: string): Promise<ProductCreateProgressDto> {
  return apiRequest<ProductCreateProgressDto>(`${API_PRODUCT_CREATE_PROGRESS}/${encodeURIComponent(requestId)}/progress`)
}

export async function pollProductCreateProgress(
  requestId: string,
  opts: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<ProductCreateProgressDto> {
  return pollProductCreateProgressWithUpdates(requestId, () => {}, opts)
}

export async function pollProductCreateProgressWithUpdates(
  requestId: string,
  onProgress: (progress: ProductCreateProgressDto) => void,
  opts: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<ProductCreateProgressDto> {
  const intervalMs = opts.intervalMs ?? 2000
  const maxAttempts = opts.maxAttempts ?? 120
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const progress = await getProductCreateProgress(requestId)
    onProgress(progress)
    if (progress.status === 'success' || progress.status === 'failed') {
      return progress
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('product_create_timeout')
}

export type { SchemaAttrWeb }
