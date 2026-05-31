const STORAGE_KEY = 'tach.darkMode'

export function loadDarkMode(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'false') {
      return false
    }
  } catch {
    // ignore
  }
  return true
}

export function saveDarkMode(darkMode: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(darkMode))
  } catch {
    // ignore
  }
}

export function applyTheme(darkMode: boolean): void {
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
}
