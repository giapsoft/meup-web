import { useEffect, useState } from 'react'
import { getAccount, resendVerification, type AccountDto } from '../api/emailAuth'
import { useLanguagePair } from '../context/LanguagePairProvider'

type ResendState = 'idle' | 'sending' | 'sent' | 'error'

/**
 * Banner nhắc xác thực email. Hiển thị khi tài khoản CÓ email nhưng CHƯA xác thực (xác thực
 * là optional — không chặn gì, chỉ nhắc + cho gửi lại mail). Phiên device (không có email)
 * hoặc đã xác thực → không hiện gì.
 */
export function VerifyEmailBanner() {
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
        // Không lấy được tài khoản → ẩn banner.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!account || !account.email || account.emailVerified) {
    return null
  }

  async function handleResend() {
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
  }

  return (
    <div className="border-b border-warning/30 bg-warning-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span className="text-warning">
          {resend === 'sent' ? t('verify.banner.sent') : t('verify.banner.message')}
          {resend === 'error' && ` ${t('verify.banner.error')}`}
        </span>
        {resend !== 'sent' && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resend === 'sending'}
            className="shrink-0 self-start rounded-lg border border-warning/40 px-3 py-1.5 font-medium text-warning transition hover:bg-warning/10 disabled:opacity-60 sm:self-auto"
          >
            {resend === 'sending' ? t('verify.banner.sending') : t('verify.banner.resend')}
          </button>
        )}
      </div>
    </div>
  )
}
