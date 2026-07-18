import {
  API_ADMIN_CREDIT_PACKAGES,
  API_ADMIN_CREDITS_ADJUST,
  API_ADMIN_SELLER_BALANCES,
  API_ADMIN_SELLER_RECORD,
  API_ADMIN_SYSTEM_CONFIG,
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

export type AdminCreditAdjustBody = {
  userIds?: string[]
  emails?: string[]
  deviceOrders?: number[]
  direction: 'increase' | 'decrease'
  creditAmount: number
  note: string
}

export type AdminCreditAdjustResult = {
  id: string
  userId: string
  email: string
  delta: number
  newBalance: number
  note: string
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

export async function adjustAdminUserCredits(
  secret: string,
  body: AdminCreditAdjustBody,
): Promise<AdminCreditAdjustResult[]> {
  const data = await adminRequest<{ adjustments: AdminCreditAdjustResult[] }>(
    secret,
    API_ADMIN_CREDITS_ADJUST,
    { method: 'POST', body },
  )
  return data.adjustments ?? []
}

export type AdminSystemConfigKind = 'bool' | 'int' | 'text' | 'json' | 'compact'

export type AdminSystemConfigEntry = {
  key: string
  kind: AdminSystemConfigKind
  value: string
  defaultValue: string
  inDatabase: boolean
  description: string
}

export async function listAdminSystemConfig(secret: string): Promise<AdminSystemConfigEntry[]> {
  const data = await adminRequest<{ entries: AdminSystemConfigEntry[] }>(
    secret,
    API_ADMIN_SYSTEM_CONFIG,
  )
  return data.entries ?? []
}

export async function updateAdminSystemConfig(
  secret: string,
  entries: Array<{ key: string; value: string }>,
): Promise<AdminSystemConfigEntry[]> {
  const data = await adminRequest<{ entries: AdminSystemConfigEntry[] }>(
    secret,
    API_ADMIN_SYSTEM_CONFIG,
    { method: 'PUT', body: { entries } },
  )
  return data.entries ?? []
}
