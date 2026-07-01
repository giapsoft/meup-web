import {
  API_ADMIN_CREDIT_PACKAGES,
  API_ADMIN_SELLER_BALANCES,
  API_ADMIN_SELLER_RECORD,
} from '../config'
import { adminRequest } from './adminClient'

/** Matches `GET /api/admin/seller-payout/balances` list item. */
export type SellerBalanceDto = {
  userId: string
  earnedCredits: number
  totalSellerPayout: number
  payableCredits: number
}

/** Matches `PUT /api/admin/credit-packages` item (response includes timestamps). */
export type CreditPackageDto = {
  id: string
  name: string
  amount: number
  term: string
  monthCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CreditPackageInput = {
  id: string
  name: string
  amount: number
  term: string
  monthCount: number
}

export type RecordSellerPayoutEntry = {
  userId: string
  creditAmount: number
  direction: 'increase' | 'decrease'
  channel: string
  detail?: unknown
}

export type RecordSellerPayoutResult = {
  id: string
  userId: string
  creditAmount: number
  direction: string
  channel: string
  detail: unknown
}

export async function listAdminSellerBalances(secret: string): Promise<SellerBalanceDto[]> {
  const data = await adminRequest<{ sellers: SellerBalanceDto[] }>(secret, API_ADMIN_SELLER_BALANCES)
  return data.sellers ?? []
}

/** Kiểm tra mã admin bằng cách gọi API balances. */
export async function verifyAdminSecret(secret: string): Promise<void> {
  await listAdminSellerBalances(secret)
}

export async function recordAdminSellerPayouts(
  secret: string,
  entries: RecordSellerPayoutEntry[],
): Promise<RecordSellerPayoutResult[]> {
  const data = await adminRequest<{ records: RecordSellerPayoutResult[] }>(
    secret,
    API_ADMIN_SELLER_RECORD,
    { method: 'POST', body: { entries } },
  )
  return data.records ?? []
}

export async function syncAdminCreditPackages(
  secret: string,
  packages: CreditPackageInput[],
): Promise<CreditPackageDto[]> {
  const data = await adminRequest<{ packages: CreditPackageDto[] }>(secret, API_ADMIN_CREDIT_PACKAGES, {
    method: 'PUT',
    body: { packages },
  })
  return data.packages ?? []
}
