import {
  API_CREDIT_PACKAGES,
  API_PAYMENT_CHECKOUT,
  API_PAYMENT_CHECKOUT_PREFIX,
  API_PAYMENT_FAKE_TOPUP,
} from '../config'
import { apiRequest } from './client'

export type CreditPackageDto = {
  id: string
  name: string
  amount: number
  priceVnd: number
  term: string
  monthCount: number
  active: boolean
}

export type PaymentMethod = 'bank_transfer_qr' | 'redirect' | 'none'

export type PaymentInstructions = {
  provider: string
  method: PaymentMethod | string
  amountVnd: number
  currency: string
  qrImageUrl?: string
  bankAccountNumber?: string
  bankCode?: string
  bankName?: string
  accountHolder?: string
  transferContent?: string
  redirectUrl?: string
}

export type CheckoutSessionDto = {
  checkoutId: string
  status: string
  package: CreditPackageDto
  fakePaymentEnabled: boolean
  expiresAt: string
  instructions: PaymentInstructions
}

export type CheckoutStatusDto = {
  checkoutId: string
  status: string
  creditBalance: number
  packageId: string
  expiresAt: string
}

export type FakeTopupResultDto = {
  provider: string
  providerPaymentId: string
  creditPackageId: string
  creditAmount: number
}

export async function listCreditPackages(): Promise<CreditPackageDto[]> {
  const data = await apiRequest<{ packages: CreditPackageDto[] }>(API_CREDIT_PACKAGES)
  return data.packages ?? []
}

export async function createCheckout(input: {
  packageId: string
  provider?: string
}): Promise<CheckoutSessionDto> {
  return apiRequest<CheckoutSessionDto>(API_PAYMENT_CHECKOUT, {
    method: 'POST',
    body: {
      packageId: input.packageId,
      ...(input.provider ? { provider: input.provider } : {}),
    },
  })
}

export async function getCheckout(checkoutId: string): Promise<CheckoutStatusDto> {
  return apiRequest<CheckoutStatusDto>(`${API_PAYMENT_CHECKOUT_PREFIX}/${encodeURIComponent(checkoutId)}`)
}

export async function fakeTopup(input: {
  checkoutId?: string
  packageId?: string
}): Promise<FakeTopupResultDto> {
  return apiRequest<FakeTopupResultDto>(API_PAYMENT_FAKE_TOPUP, {
    method: 'POST',
    body: {
      ...(input.checkoutId ? { checkoutId: input.checkoutId } : {}),
      ...(input.packageId ? { packageId: input.packageId } : {}),
    },
  })
}
