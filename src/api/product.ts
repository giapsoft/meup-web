import { API_PRODUCT_SETTINGS } from '../config'
import { apiRequest } from './client'

/** Matches `GET /api/product/owned` → `ownedProductData`. */
export type OwnedProductDto = {
  productId: string
  name: string
  description: string
  creditPrice: number
  shareMode: string
  creatorId: string
  nativeLang: string
  studyLang: string
  langPair: string
  createdAt: string
  updatedAt: string
}

/** Matches `GET /api/product/owned` response `data`. */
export type OwnedProductsResponse = {
  products: OwnedProductDto[]
}

/** Matches `GET /api/product/purchased` list item. */
export type PurchasedProductDto = {
  transactionId: string
  creditAmount: number
  purchasedAt: string
  productId: string
  name: string
  description: string
  creditPrice: number
  creatorId: string
  nativeLang: string
  studyLang: string
  langPair: string
}

/** Matches `GET /api/product/purchased` response `data`. */
export type PurchasedProductsResponse = {
  products: PurchasedProductDto[]
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

/** Matches `GET /api/product/catalog` list item (`CatalogProduct` in Go). */
export type CatalogProductDto = {
  productId: string
  name: string
  description: string
  creditPrice: number
  vocabCount: number
  childrenCount: number
  totalSize: number
  nativeLang: string
  studyLang: string
  langPair: string
  creatorId: string
  creatorEmail?: string
  isOwner: boolean
  isPurchased: boolean
  isShared: boolean
  createdAt: string
  updatedAt: string
}

/** Matches `GET /api/product/catalog` response `data`. */
export type ProductCatalogResponse = {
  products: CatalogProductDto[]
  pagination: PaginationDto
}

/** Matches `POST /api/product/purchase` response `data`. */
export type PurchaseProductResponse = {
  transactionId: string
  productId: string
  creditAmount: number
}

/** Matches `PATCH /api/product/settings` response `data` (`ProductSettings` in Go). */
export type ProductSettingsDto = {
  productId: string
  name: string
  description: string
  creditPrice: number
  shareMode: string
  updatedAt: string
}

/** Body for `PATCH /api/product/settings` — send only fields to update (plus productId). */
export type PatchProductSettingsBody = {
  productId: string
  name?: string
  description?: string
  creditPrice?: number
  shareMode?: 'public' | 'private'
}

export type ListProductCatalogParams = {
  nativeLang?: string
  studyLang?: string
  langPair?: string
  page?: number
  limit?: number
}

export type ListOwnedProductsParams = {
  nativeLang: string
  studyLang: string
}

export type ListPurchasedProductsParams = {
  nativeLang: string
  studyLang: string
}

export type ListProductCreateRequestsParams = {
  nativeLang: string
  studyLang: string
  page?: number
  limit?: number
}

export async function listOwnedProducts(
  userId: string,
  params: ListOwnedProductsParams,
): Promise<OwnedProductsResponse> {
  const q = new URLSearchParams({
    userId,
    nativeLang: params.nativeLang,
    studyLang: params.studyLang,
  })
  return apiRequest<OwnedProductsResponse>(`/api/product/owned?${q.toString()}`)
}

export async function listPurchasedProducts(
  userId: string,
  params: ListPurchasedProductsParams,
): Promise<PurchasedProductsResponse> {
  const q = new URLSearchParams({
    userId,
    nativeLang: params.nativeLang,
    studyLang: params.studyLang,
  })
  return apiRequest<PurchasedProductsResponse>(`/api/product/purchased?${q.toString()}`)
}

export async function listProductCreateRequests(
  ownerId: string,
  params: ListProductCreateRequestsParams,
): Promise<ProductCreateRequestListResponse> {
  const q = new URLSearchParams({
    ownerId,
    nativeLang: params.nativeLang,
    studyLang: params.studyLang,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  })
  return apiRequest<ProductCreateRequestListResponse>(`/api/product-create?${q.toString()}`)
}

/** Public marketplace catalog; viewer flags come from JWT (`isOwner`, `isPurchased`, `isShared`). */
export async function listProductCatalog(
  params: ListProductCatalogParams = {},
): Promise<ProductCatalogResponse> {
  const q = new URLSearchParams()
  if (params.nativeLang) {
    q.set('nativeLang', params.nativeLang)
  }
  if (params.studyLang) {
    q.set('studyLang', params.studyLang)
  }
  if (params.langPair) {
    q.set('langPair', params.langPair)
  }
  if (params.page != null) {
    q.set('page', String(params.page))
  }
  if (params.limit != null) {
    q.set('limit', String(params.limit))
  }
  const query = q.toString()
  return apiRequest<ProductCatalogResponse>(
    query ? `/api/product/catalog?${query}` : '/api/product/catalog',
  )
}

/** Buy a public product with credits. User id comes from JWT. */
export async function purchaseProduct(productId: string): Promise<PurchaseProductResponse> {
  return apiRequest<PurchaseProductResponse>('/api/product/purchase', {
    method: 'POST',
    body: { productId },
  })
}

/** Owner updates marketplace metadata. JWT required; owner from `sub`. */
export async function patchProductSettings(
  body: PatchProductSettingsBody,
): Promise<ProductSettingsDto> {
  return apiRequest<ProductSettingsDto>(API_PRODUCT_SETTINGS, {
    method: 'PATCH',
    body,
  })
}
