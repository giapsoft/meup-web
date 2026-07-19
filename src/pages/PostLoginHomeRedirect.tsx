import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthLoadingPage } from './AuthGatePages'
import { useLanguagePair } from '../context/LanguagePairProvider'
import {
  resolvePostLoginLandingPath,
  type PostLoginLandingPath,
} from '../utils/postLoginLanding'

/**
 * Route `/` sau khi đã có phiên: điều hướng tới Quản lý hoặc Khám phá
 * tùy user đã có / được chia sẻ từ vựng hay chưa.
 */
export function PostLoginHomeRedirect() {
  const { nativeLang, studyLang } = useLanguagePair()
  const [target, setTarget] = useState<PostLoginLandingPath | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const path = await resolvePostLoginLandingPath(nativeLang, studyLang)
      if (!cancelled) {
        setTarget(path)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nativeLang, studyLang])

  if (!target) {
    return <AuthLoadingPage locale={nativeLang || 'vi'} />
  }

  return <Navigate to={target} replace />
}
