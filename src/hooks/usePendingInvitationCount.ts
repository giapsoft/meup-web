import { useEffect, useState } from 'react'
import { getInvitationCount } from '../api/product'

/** Pending share-invitation count for nav label `Lời mời (N)`. Fetches once on mount — reload page to refresh. */
export function usePendingInvitationCount(): { count: number } {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await getInvitationCount()
        if (!cancelled) {
          setCount(res.pendingCount)
        }
      } catch {
        if (!cancelled) {
          setCount(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { count }
}
