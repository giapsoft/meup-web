import { API_PRODUCT_SETTINGS } from '../config'
import { apiRequest } from './client'
import {
  parseDeviceProgramsCompact,
  type DeviceProgramsDto,
} from '../utils/deviceProgramsCompact'

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
  /** v2 primary title; legacy list may still send productName. */
  title?: string
  description?: string
  type?: 'manual' | 'title' | 'image' | 'paragraph'
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
  params: ListProductCreateRequestsParams,
): Promise<ProductCreateRequestListResponse> {
  const q = new URLSearchParams({
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

/** Matches `GET /api/product/draft` response `data`. */
export type ProductDraftResponse = {
  productId: string
  draftData: string
}

/** Matches `POST /api/product/draft` response `data`. */
export type SaveProductDraftResponse = {
  productId: string
}

/** Matches `POST /api/product/export-version` response `data`. */
export type ExportProductVersionResponse = {
  productId: string
  versionId: number
}

export type ExportProductVersionBody = {
  productId: string
  tree: {
    pair: { nativeLang: string; studyLang: string }
    config: unknown[]
    root: {
      name: string
      depth: number
      itemIndexes: number[]
      children: []
    }
    items: string[][]
  }
}

export async function getProductDraft(productId: string): Promise<ProductDraftResponse> {
  const q = new URLSearchParams({ productId })
  return apiRequest<ProductDraftResponse>(`/api/product/draft?${q.toString()}`)
}

/** Matches `GET /api/product/import-package` response `data`. */
export type ProductImportPackageResponse = {
  productId: string
  tree: ExportProductVersionBody['tree']
}

export async function getProductImportPackage(
  productId: string,
): Promise<ProductImportPackageResponse> {
  const q = new URLSearchParams({ productId })
  return apiRequest<ProductImportPackageResponse>(`/api/product/import-package?${q.toString()}`)
}

export async function saveProductDraft(
  productId: string,
  draftData: string,
): Promise<SaveProductDraftResponse> {
  return apiRequest<SaveProductDraftResponse>('/api/product/draft', {
    method: 'POST',
    body: { productId, draftData },
  })
}

export async function exportProductVersion(
  body: ExportProductVersionBody,
): Promise<ExportProductVersionResponse> {
  return apiRequest<ExportProductVersionResponse>('/api/product/export-version', {
    method: 'POST',
    body,
  })
}

/** Matches `GET /api/product/shares` list item. */
export type ProductShareEntryDto = {
  userId: string
  email: string
  sharedAt: string
}

/** Matches `GET /api/product/shares` response `data`. */
export type ProductSharesResponse = {
  productId: string
  shares: ProductShareEntryDto[]
}

/** Body for `POST /api/product/share` and `/unshare`. */
export type ProductShareTargetsBody = {
  productId: string
  userIds?: string[]
  emails?: string[]
  deviceOrders?: number[]
}

/** Matches `POST /api/product/share` response `data`. */
export type ShareProductResponse = {
  sharedUserIds: string[]
  added: number
}

/** Matches `POST /api/product/unshare` response `data`. */
export type UnshareProductResponse = {
  revokedUserIds: string[]
  removed: number
}

export async function listProductShares(productId: string): Promise<ProductSharesResponse> {
  const q = new URLSearchParams({ productId })
  return apiRequest<ProductSharesResponse>(`/api/product/shares?${q.toString()}`)
}

export async function shareProduct(body: ProductShareTargetsBody): Promise<ShareProductResponse> {
  return apiRequest<ShareProductResponse>('/api/product/share', {
    method: 'POST',
    body,
  })
}

export async function unshareProduct(body: ProductShareTargetsBody): Promise<UnshareProductResponse> {
  return apiRequest<UnshareProductResponse>('/api/product/unshare', {
    method: 'POST',
    body,
  })
}

/** Catalog grouped by lang pair (owned, shared, purchased). Wire format is compact v1. */
export async function getDevicePrograms(): Promise<DeviceProgramsDto> {
  const raw = await apiRequest<unknown>('/api/product/device-programs')
  return parseDeviceProgramsCompact(raw)
}
