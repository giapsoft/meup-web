import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmailToken } from '../../api/emailAuth'
import { useLanguagePair } from '../../context/LanguagePairProvider'

type VerifyStatus = 'verifying' | 'success' | 'fail'

// Gộp các lần verify cùng token (StrictMode mount kép) thành 1 request — token dùng-một-lần,
// gọi lần 2 sẽ bị từ chối (đã consume).
const attempts = new Map<string, Promise<void>>()

function verifyOnce(token: string): Promise<void> {
  const existing = attempts.get(token)
  if (existing) {
    return existing
  }
  const promise = verifyEmailToken(token)
  attempts.set(token, promise)
  return promise
}

export function VerifyEmailPage() {
  const { t } = useLanguagePair()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<VerifyStatus>('verifying')

  useEffect(() => {
    let cancelled = false
    if (!token) {
      setStatus('fail')
      return
    }
    verifyOnce(token)
      .then(() => {
        if (!cancelled) {
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('fail')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-8 shadow-xl">
        {status === 'verifying' && (
          <>
            <div
              className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-border border-t-accent"
              aria-hidden
            />
            <p className="text-sm text-text-muted">{t('verify.page.verifying')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-credit/15 text-2xl text-credit"
              aria-hidden
            >
              ✓
            </div>
            <h1 className="text-xl font-semibold text-text">{t('verify.page.successTitle')}</h1>
            <p className="mt-2 text-sm text-text-muted">{t('verify.page.successBody')}</p>
          </>
        )}

        {status === 'fail' && (
          <>
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-2xl text-red-500"
              aria-hidden
            >
              !
            </div>
            <h1 className="text-xl font-semibold text-text">{t('verify.page.failTitle')}</h1>
            <p className="mt-2 text-sm text-text-muted">{t('verify.page.failBody')}</p>
          </>
        )}

        {status !== 'verifying' && (
          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90"
          >
            {t('verify.page.backHome')}
          </Link>
        )}
      </div>
    </main>
  )
}
