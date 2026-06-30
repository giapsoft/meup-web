import { API_PRODUCT_CREATE, API_PRODUCT_CREATE_PROGRESS } from '../config'
import { apiRequest } from './client'

export type CreateProductJob = {
  type: 'vocab'
  content: string
  limitCount: number
}

export type CreateProductRequestBody = {
  ownerId: string
  productName: string
  productDescription?: string
  nativeLangId: string
  studyLangId: string
  payload: string
  jobs: CreateProductJob[]
}

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
  const intervalMs = opts.intervalMs ?? 2000
  const maxAttempts = opts.maxAttempts ?? 120
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const progress = await getProductCreateProgress(requestId)
    if (progress.status === 'success' || progress.status === 'failed') {
      return progress
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error('product_create_timeout')
}
