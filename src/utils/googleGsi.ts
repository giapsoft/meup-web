const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

let loadPromise: Promise<void> | null = null

export function loadGoogleGsiScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('google_gis_no_window'))
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`)
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('google_gis_load_failed')), {
          once: true,
        })
        return
      }
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('google_gis_load_failed'))
      document.head.appendChild(script)
    })
  }
  return loadPromise
}
