import {
  API_ADMIN_APP_VERSION_CLEAR,
  API_ADMIN_APP_VERSION_PUBLISH,
  API_ADMIN_CREDITS_ADJUST,
  API_ADMIN_GENERATE_DESCRIPTION,
  API_ADMIN_SELLER_BALANCES,
  API_ADMIN_SELLER_RECORD,
  API_ADMIN_SYSTEM_CONFIG,
} from '../config'
import type { SchemaAttrWeb } from '../types/webConfig'
import { adminRequest, adminRequestForm } from './adminClient'

/** Matches `GET /api/admin/seller-payout/balances` list item. */
export type SellerBalanceDto = {
  userId: string
  earnedCredits: number
  totalSellerPayout: number
  payableCredits: number
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

export type AdminSystemConfigKind = 'bool' | 'int' | 'text' | 'json' | 'compact' | 'programConfig'

export type AdminSystemConfigEntry = {
  key: string
  kind: AdminSystemConfigKind
  value: string
  defaultValue: string
  inDatabase: boolean
  description: string
}

/** system_config key for web create-product default ProgramConfigWeb. */
export const WEB_DEFAULT_PROGRAM_CONFIG_KEY = 'WEB_DEFAULT_PROGRAM_CONFIG'

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

export type AdminGenerateDescriptionResult = {
  attrs: SchemaAttrWeb[]
}

/** Fill missing attr descriptions — admin secret, no credit charge. */
export async function adminGenerateDescription(
  secret: string,
  attrs: SchemaAttrWeb[],
): Promise<AdminGenerateDescriptionResult> {
  return adminRequest<AdminGenerateDescriptionResult>(secret, API_ADMIN_GENERATE_DESCRIPTION, {
    method: 'POST',
    body: { attrs },
  })
}

export type AdminAppVersionPublishResult = {
  appVersion: string
  path: string
  sha256: string
  fileSize: number
}

export async function publishAdminAppVersion(
  secret: string,
  input: { appVersion: string; file: File },
): Promise<AdminAppVersionPublishResult> {
  const form = new FormData()
  form.append('appVersion', input.appVersion.trim())
  form.append('file', input.file)
  return adminRequestForm<AdminAppVersionPublishResult>(
    secret,
    API_ADMIN_APP_VERSION_PUBLISH,
    form,
  )
}

export async function clearAdminAppVersion(secret: string): Promise<{ cleared: boolean }> {
  return adminRequest<{ cleared: boolean }>(secret, API_ADMIN_APP_VERSION_CLEAR, {
    method: 'POST',
    body: {},
  })
}
