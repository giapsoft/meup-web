import { apiRequest } from './client'

/** Matches `GET /api/product/owned` → `ownedProductData`. */
export type OwnedProductDto = {
  productId: string
  name: string
  description: string
  creditPrice: number
  shareMode: string
  creatorId: string
  createdAt: string
  updatedAt: string
}

/** Matches `GET /api/product/owned` response `data`. */
export type OwnedProductsResponse = {
  products: OwnedProductDto[]
}

/** Matches `GET /api/product-create` list item. */
export type ProductCreateRequestSummaryDto = {
  id: string
  ownerId: string
  productName: string
  productDescription: string
  payload: string
  nativeLangId: string
  studyLangId: string
  status: string
  totalCredits: number
  createdAt: string
  updatedAt: string
}

export type PaginationDto = {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Matches `GET /api/product-create?ownerId=` response `data`. */
export type ProductCreateRequestListResponse = {
  requests: ProductCreateRequestSummaryDto[]
  pagination: PaginationDto
}

export async function listOwnedProducts(userId: string): Promise<OwnedProductsResponse> {
  const q = new URLSearchParams({ userId })
  return apiRequest<OwnedProductsResponse>(`/api/product/owned?${q.toString()}`)
}

export async function listProductCreateRequests(
  ownerId: string,
  page = 1,
  limit = 20,
): Promise<ProductCreateRequestListResponse> {
  const q = new URLSearchParams({
    ownerId,
    page: String(page),
    limit: String(limit),
  })
  return apiRequest<ProductCreateRequestListResponse>(`/api/product-create?${q.toString()}`)
}
