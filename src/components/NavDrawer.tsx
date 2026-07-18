import { useEffect, useId, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MAIN_NAV_ITEMS, isNavItemActive } from '../config/nav'
import { useAccount } from '../context/AccountProvider'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { useTheme } from '../context/ThemeProvider'
import { CreditIcon } from './CreditIcon'
import { ThemeToggle } from './ThemeToggle'
import { VerifyEmailNotice } from './VerifyEmailNotice'

type NavDrawerProps = {
  open: boolean
  onClose: () => void
  onLogout: () => void
  activeCreateRequestCount: number
}

export function NavDrawer({
  open,
  onClose,
  onLogout,
  activeCreateRequestCount,
}: NavDrawerProps) {
  const { pathname } = useLocation()
  const { t } = useLanguagePair()
  const { creditBalance } = useAccount()
  const { darkMode, setDarkMode } = useTheme()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return
      }
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t('nav.closeMenu')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 left-0 flex w-[min(86vw,20rem)] flex-col border-r border-border bg-surface-raised pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p id={titleId} className="text-base font-semibold text-text">
            MeUp
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text"
            aria-label={t('nav.closeMenu')}
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label={t('nav.drawerLabel')}>
          <ul className="flex flex-col gap-0.5">
            {MAIN_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item)
              const showJobsBadge = item.path === '/products' && activeCreateRequestCount > 0
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm font-medium no-underline transition',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text',
                    ].join(' ')}
                  >
                    <span>{t(item.labelKey)}</span>
                    {showJobsBadge && (
                      <span
                        className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-white"
                        aria-label={t('nav.jobsBadge', { count: activeCreateRequestCount })}
                      >
                        {activeCreateRequestCount > 99 ? '99+' : activeCreateRequestCount}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-auto border-t border-border px-2 py-2">
          <VerifyEmailNotice className="mx-1 mb-2" />

          <div className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm text-text-muted">
              <CreditIcon />
              {t('nav.credits')}
            </span>
            <span className="text-sm font-semibold tabular-nums text-amber-400">{creditBalance}</span>
          </div>

          <div
            className="rounded-lg px-3 py-2.5 opacity-60"
            title={t('nav.getCreditsSoon')}
            aria-disabled="true"
          >
            <p className="text-sm text-text">{t('nav.getCredits')}</p>
            <p className="mt-0.5 text-xs text-text-muted">{t('nav.getCreditsSoon')}</p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5">
            <span className="text-sm text-text">{t('nav.darkMode')}</span>
            <ThemeToggle
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              label={t('nav.darkMode')}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="w-full rounded-lg px-3 py-3 text-left text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
