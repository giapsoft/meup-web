import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'
import { loginGoogle } from '../api/emailAuth'
import { GOOGLE_OAUTH_CLIENT_ID } from '../config'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'
import { loadGoogleGsiScript } from '../utils/googleGsi'

const GOOGLE_ERROR_KEYS: Record<string, TranslationKey> = {
  invalid_token: 'auth.google.error.invalid_token',
  google_account_conflict: 'auth.google.error.google_account_conflict',
  google_not_configured: 'auth.google.error.google_not_configured',
  too_many_requests: 'auth.error.too_many_requests',
}

export function googleSignInErrorKey(err: unknown): TranslationKey {
  if (err instanceof ApiError) {
    if (err.code === 'network_error') {
      return 'auth.error.network'
    }
    const key = GOOGLE_ERROR_KEYS[err.code]
    if (key) {
      return key
    }
  }
  return 'auth.google.error.generic'
}

type GoogleSignInButtonProps = {
  disabled?: boolean
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  onAuthenticated: () => void
  onError: (key: TranslationKey) => void
  onBusyChange?: (busy: boolean) => void
}

export function GoogleSignInButton({
  disabled = false,
  text = 'continue_with',
  onAuthenticated,
  onError,
  onBusyChange,
}: GoogleSignInButtonProps) {
  const { t, uiLocale } = useLanguagePair()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const busyRef = useRef(false)
  const onAuthenticatedRef = useRef(onAuthenticated)
  const onErrorRef = useRef(onError)
  const onBusyChangeRef = useRef(onBusyChange)

  onAuthenticatedRef.current = onAuthenticated
  onErrorRef.current = onError
  onBusyChangeRef.current = onBusyChange

  useEffect(() => {
    if (!GOOGLE_OAUTH_CLIENT_ID || disabled) {
      return
    }

    let cancelled = false
    const container = containerRef.current
    if (!container) {
      return
    }

    async function mount() {
      try {
        await loadGoogleGsiScript()
        if (cancelled || !container) {
          return
        }
        container.replaceChildren()
        const width = Math.min(400, Math.max(200, container.clientWidth || 320))
        google.accounts.id.initialize({
          client_id: GOOGLE_OAUTH_CLIENT_ID,
          callback: (response) => {
            void (async () => {
              const credential = response.credential?.trim()
              if (!credential || busyRef.current) {
                return
              }
              busyRef.current = true
              onBusyChangeRef.current?.(true)
              try {
                await loginGoogle(credential)
                onAuthenticatedRef.current()
              } catch (err) {
                onErrorRef.current(googleSignInErrorKey(err))
              } finally {
                busyRef.current = false
                onBusyChangeRef.current?.(false)
              }
            })()
          },
        })
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          width,
          locale: uiLocale,
        })
      } catch {
        if (!cancelled) {
          setLoadFailed(true)
        }
      }
    }

    void mount()
    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [disabled, text, uiLocale])

  if (!GOOGLE_OAUTH_CLIENT_ID) {
    return null
  }

  if (loadFailed) {
    return (
      <p className="text-center text-xs text-text-muted">{t('auth.google.error.loadFailed')}</p>
    )
  }

  return (
    <div
      ref={containerRef}
      className={[
        'flex min-h-10 w-full justify-center',
        disabled ? 'pointer-events-none opacity-60' : '',
      ].join(' ')}
    />
  )
}

export function GoogleSignInDivider() {
  const { t } = useLanguagePair()
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    return null
  }
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-border" />
      </div>
      <p className="relative mx-auto w-fit bg-surface-raised px-3 text-xs text-text-muted">
        {t('auth.dividerOr')}
      </p>
    </div>
  )
}
