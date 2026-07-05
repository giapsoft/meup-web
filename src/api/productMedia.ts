import { apiRequest } from './client'

export type ProductMediaPreviewResult = {
  objectKey: string
  previewUrl: string
}

export async function getProductMediaPreview(ref: string): Promise<ProductMediaPreviewResult> {
  return apiRequest<ProductMediaPreviewResult>('/api/product/media-preview', {
    method: 'POST',
    body: { ref },
  })
}
