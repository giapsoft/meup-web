const STORAGE_KEY = 'meup_admin_secret'

export function loadAdminSecret(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw?.trim() || null
  } catch {
    return null
  }
}

export function saveAdminSecret(secret: string): void {
  sessionStorage.setItem(STORAGE_KEY, secret.trim())
}

export function clearAdminSecret(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
