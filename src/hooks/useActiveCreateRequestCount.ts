import { useCallback, useEffect, useState } from 'react'
import { listProductCreateRequests } from '../api/product'
import { useLanguagePair } from '../context/LanguagePairProvider'

function isActiveCreateRequest(status: string): boolean {
  return status === 'pending' || status === 'working'
}

/** Count of in-flight create requests for the current language pair (nav badge). */
export function useActiveCreateRequestCount(): { count: number; refresh: () => Promise<void> } {
  const { nativeLang, studyLang } = useLanguagePair()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await listProductCreateRequests({
        nativeLang,
        studyLang,
        page: 1,
        limit: 20,
      })
      setCount(res.requests.filter((r) => isActiveCreateRequest(r.status)).length)
    } catch {
      setCount(0)
    }
  }, [nativeLang, studyLang])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => {
      void refresh()
    }, 60_000)
    return () => window.clearInterval(id)
  }, [refresh])

  return { count, refresh }
}
