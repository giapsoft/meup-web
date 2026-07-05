/** Matches server `jobcontent.IsStoredMediaRef`. */
export function isStoredMediaRef(value: string | undefined): boolean {
  const s = (value ?? '').trim()
  if (!s) {
    return false
  }
  if (s.startsWith('audios/') || s.startsWith('images/')) {
    return true
  }
  const lower = s.toLowerCase()
  return lower.startsWith('http://') || lower.startsWith('https://')
}

export function isPackageObjectKeyRef(value: string | undefined): boolean {
  const s = (value ?? '').trim()
  return s.startsWith('audios/') || s.startsWith('images/')
}
