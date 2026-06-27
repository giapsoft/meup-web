const STORAGE_KEY = 'meup.deviceSession'

/** Lựa chọn ngôn ngữ của phiên (suy ra từ QR URL), tách khỏi token xác thực. */
export type DeviceSession = {
  nativeLangCode: string
  studyLangCode: string
}

export function loadDeviceSession(): DeviceSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<DeviceSession>
    if (
      typeof parsed.nativeLangCode === 'string' &&
      typeof parsed.studyLangCode === 'string'
    ) {
      return parsed as DeviceSession
    }
  } catch {
    // ignore corrupt storage
  }
  return null
}

export function saveDeviceSession(session: DeviceSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function patchDeviceSession(patch: Partial<DeviceSession>): void {
  const current = loadDeviceSession()
  if (!current) {
    return
  }
  saveDeviceSession({ ...current, ...patch })
}

export function clearDeviceSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
