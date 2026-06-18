import { API_DEVICE_VERIFY_LINK, MOCK_VALID_AUTH_CODE } from '../config'

export type VerifyLinkRequest = {
  authCode: string
}

export type VerifyLinkResponse = {
  ok: boolean
}

const MOCK_LATENCY_MS = 400

/**
 * Mock POST /api/device/verify-link — replace with real fetch when capygo-api is ready.
 * Valid authCode for mock: {@link MOCK_VALID_AUTH_CODE} (`meup`).
 */
export async function verifyDeviceLink(
  authCode: string,
): Promise<VerifyLinkResponse> {
  const request: VerifyLinkRequest = { authCode }

  console.info('[meup-web mock API]', {
    method: 'POST',
    url: API_DEVICE_VERIFY_LINK,
    body: request,
  })

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

  // Real implementation:
  // const res = await fetch(API_DEVICE_VERIFY_LINK, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(request),
  // })
  // if (!res.ok) return { ok: false }
  // return (await res.json()) as VerifyLinkResponse

  return { ok: authCode === MOCK_VALID_AUTH_CODE }
}
