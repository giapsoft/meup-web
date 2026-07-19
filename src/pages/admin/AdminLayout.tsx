import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { TranslationKey } from '../../i18n/types'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type NavItem = {
  to: string
  labelKey: TranslationKey
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/panel/balances', labelKey: 'admin.tab.balances' },
  { to: '/admin/panel/payout', labelKey: 'admin.tab.payout' },
  { to: '/admin/panel/packages', labelKey: 'admin.tab.packages' },
  { to: '/admin/panel/credits', labelKey: 'admin.tab.credits' },
  { to: '/admin/panel/firmware', labelKey: 'admin.tab.firmware' },
  { to: '/admin/panel/default-program-config', labelKey: 'admin.defaultProgramConfig.open' },
  { to: '/admin/panel/config', labelKey: 'admin.config.open' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition',
    isActive
      ? 'bg-surface-card text-text shadow-sm'
      : 'text-text-muted hover:bg-surface-hover hover:text-text',
  ].join(' ')

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

type AdminNavPanelProps = {
  onNavigate?: () => void
  onExit: () => void
  /** Extra class for the scrollable nav (desktop sidebar vs drawer). */
  className?: string
}

function AdminNavLinks({ onNavigate, onExit, className }: AdminNavPanelProps) {
  const { t } = useLanguagePair()

  return (
    <>
      <nav className={className} aria-label={t('admin.tabsLabel')}>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass} onClick={onNavigate}>
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-border px-3 py-3 md:px-4 md:py-4">
        <button
          type="button"
          onClick={onExit}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted transition hover:border-warning/40 hover:text-text"
        >
          {t('admin.panel.exit')}
        </button>
      </div>
    </>
  )
}

type AdminNavDrawerProps = {
  open: boolean
  onClose: () => void
  onExit: () => void
}

function AdminNavDrawer({ open, onClose, onExit }: AdminNavDrawerProps) {
  const { t } = useLanguagePair()
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
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4 sm:py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
            <p id={titleId} className="text-base font-semibold text-text">
              {t('admin.panel.title')}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text sm:h-10 sm:w-10"
            aria-label={t('nav.closeMenu')}
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        <AdminNavLinks
          onNavigate={onClose}
          onExit={onExit}
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2"
        />
      </div>
    </div>
  )
}

/** Shared shell: left nav (desktop) / drawer (mobile) + content outlet. */
export function AdminLayout() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    if (isDesktop) {
      setDrawerOpen(false)
    }
  }, [isDesktop])

  if (!secret) {
    return <Navigate to="/admin" replace />
  }

  function handleExit() {
    clearAdminSecret()
    setDrawerOpen(false)
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface md:flex-row">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text transition hover:border-accent/40"
            aria-expanded={drawerOpen}
            aria-label={t('nav.openMenu')}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
            <h1 className="truncate text-base font-semibold text-text">{t('admin.panel.title')}</h1>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 border-border bg-surface-raised md:sticky md:top-0 md:flex md:h-svh md:w-56 md:flex-col md:border-r lg:w-60">
        <div className="px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
          <h1 className="mt-0.5 text-lg font-semibold text-text">{t('admin.panel.title')}</h1>
        </div>
        <AdminNavLinks
          onExit={handleExit}
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4"
        />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>

      <AdminNavDrawer open={drawerOpen} onClose={closeDrawer} onExit={handleExit} />
    </div>
  )
}
