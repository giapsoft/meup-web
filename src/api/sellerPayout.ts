import { API_SELLER_PAYOUT_HISTORY, API_SELLER_PAYOUT_SALES } from '../config'
import { apiRequest } from './client'
import type { PaginationDto } from './product'

/** Matches `GET /api/seller-payout/sales` list item. */
export type SellerSaleDto = {
  transactionId: string
  productId: string
  productName: string
  buyerId: string
  creditAmount: number
  soldAt: string
}

/** Matches `GET /api/seller-payout/sales` response `data`. */
export type SellerSalesResponse = {
  sales: SellerSaleDto[]
  pagination: PaginationDto
}

/** Matches `GET /api/seller-payout/history` list item. */
export type SellerPayoutDto = {
  id: string
  sellerId: string
  creditAmount: number
  direction: string
  channel: string
  detail: unknown
  createdAt: string
}

/** Matches `GET /api/seller-payout/history` response `data`. */
export type SellerPayoutHistoryResponse = {
  payouts: SellerPayoutDto[]
}

export async function listSellerSales(
  sellerId: string,
  opts: { page?: number; limit?: number } = {},
): Promise<SellerSalesResponse> {
  const q = new URLSearchParams({ sellerId })
  if (opts.page != null) {
    q.set('page', String(opts.page))
  }
  if (opts.limit != null) {
    q.set('limit', String(opts.limit))
  }
  return apiRequest<SellerSalesResponse>(`${API_SELLER_PAYOUT_SALES}?${q.toString()}`)
}

export async function listSellerPayoutHistory(sellerId: string): Promise<SellerPayoutHistoryResponse> {
  const q = new URLSearchParams({ sellerId })
  return apiRequest<SellerPayoutHistoryResponse>(`${API_SELLER_PAYOUT_HISTORY}?${q.toString()}`)
}
