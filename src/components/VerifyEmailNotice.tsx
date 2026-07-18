import { useCallback, useEffect, useState } from 'react'
import { getAccount, resendVerification, type AccountDto } from '../api/emailAuth'
import { useLanguagePair } from '../context/LanguagePairProvider'

type ResendState = 'idle' | 'sending' | 'sent' | 'error'

type VerifyEmailNoticeProps = {
  /** Compact block for drawer / account menu. */
  className?: string
}

/**
 * Reminder when the account has an email that is not verified.
 * Hidden for device-only sessions and already-verified accounts.
 */
export function VerifyEmailNotice({ className = '' }: VerifyEmailNoticeProps) {
  const { t } = useLanguagePair()
  const [account, setAccount] = useState<AccountDto | null>(null)
  const [resend, setResend] = useState<ResendState>('idle')

  useEffect(() => {
    let cancelled = false
    getAccount()
      .then((acc) => {
        if (!cancelled) {
          setAccount(acc)
        }
      })
      .catch(() => {
        /* hide notice */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleResend = useCallback(async () => {
    if (resend === 'sending') {
      return
    }
    setResend('sending')
    try {
      const acc = await resendVerification()
      setAccount(acc)
      setResend('sent')
    } catch {
      setResend('error')
    }
  }, [resend])

  if (!account || !account.email || account.emailVerified) {
    return null
  }

  return (
    <div
      className={[
        'rounded-xl border border-warning/35 bg-warning-muted px-3 py-2.5',
        className,
      ].join(' ')}
    >
      <p className="text-xs leading-snug text-warning">
        {resend === 'sent' ? t('verify.banner.sent') : t('verify.banner.message')}
        {resend === 'error' ? ` ${t('verify.banner.error')}` : null}
      </p>
      {resend !== 'sent' && (
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resend === 'sending'}
          className="mt-2 min-h-9 w-full rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning transition hover:bg-warning/10 disabled:opacity-60"
        >
          {resend === 'sending' ? t('verify.banner.sending') : t('verify.banner.resend')}
        </button>
      )}
    </div>
  )
}
