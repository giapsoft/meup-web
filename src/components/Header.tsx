import { Link } from 'react-router-dom'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { MOCK_DEVICE } from '../data/mock'

type HeaderProps = {
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const { t } = useLanguagePair()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-2.5 no-underline">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-bold text-accent"
            aria-hidden
          >
            T
          </span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-text sm:text-base">Tach</p>
            <p className="hidden truncate text-xs text-text-muted sm:block">{MOCK_DEVICE.name}</p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 sm:px-4 sm:py-2"
            title={t('nav.creditsTitle')}
          >
            <span className="text-xs text-text-muted sm:text-sm">{t('nav.credits')}</span>
            <span className="text-sm font-semibold tabular-nums text-credit sm:text-base">
              {MOCK_DEVICE.creditsRemaining}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-accent/40 hover:bg-surface-hover hover:text-text sm:px-4 sm:py-2 sm:text-sm"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}
