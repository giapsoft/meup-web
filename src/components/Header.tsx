import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditIcon } from './CreditIcon'
import { LanguagePairChip } from './LanguagePairChip'
import { MainNav } from './MainNav'
import { NavDrawer } from './NavDrawer'
import { ThemeToggle } from './ThemeToggle'
import { VerifyEmailNotice } from './VerifyEmailNotice'
import { useAccount } from '../context/AccountProvider'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { useTheme } from '../context/ThemeProvider'
import { useActiveCreateRequestCount } from '../hooks/useActiveCreateRequestCount'
import { useMediaQuery } from '../hooks/useMediaQuery'

type HeaderProps = {
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps) {
  const { t } = useLanguagePair()
  const { creditBalance } = useAccount()
  const { darkMode, setDarkMode } = useTheme()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const { count: activeCreateRequestCount, refresh: refreshActiveJobs } =
    useActiveCreateRequestCount()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pairOpen, setPairOpen] = useState(false)
  const [creditsMenuOpen, setCreditsMenuOpen] = useState(false)
  const creditsMenuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Desktop-only credits menu (theme / logout / get credits). Mobile uses drawer.
  useEffect(() => {
    if (!creditsMenuOpen) {
      return
    }
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node
      if (creditsMenuRef.current && !creditsMenuRef.current.contains(target)) {
        setCreditsMenuOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setCreditsMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [creditsMenuOpen])

  // Avoid two overlays at once.
  useEffect(() => {
    if (drawerOpen) {
      setPairOpen(false)
      setCreditsMenuOpen(false)
    }
  }, [drawerOpen])

  useEffect(() => {
    if (pairOpen) {
      setDrawerOpen(false)
      setCreditsMenuOpen(false)
    }
  }, [pairOpen])

  useEffect(() => {
    if (isDesktop) {
      setDrawerOpen(false)
    }
    // Avoid a stuck mobile sheet after breakpoint change (invisible overlay).
    setPairOpen(false)
  }, [isDesktop])

  function openDrawer() {
    void refreshActiveJobs()
    setDrawerOpen(true)
  }

  function handleLogout() {
    setCreditsMenuOpen(false)
    setDrawerOpen(false)
    onLogout()
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text transition hover:border-accent/40 md:hidden"
            aria-expanded={drawerOpen}
            aria-label={t('nav.openMenu')}
            onClick={openDrawer}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="hidden min-w-0 flex-1 md:flex">
            <MainNav activeCreateRequestCount={activeCreateRequestCount} />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <LanguagePairChip
              open={pairOpen}
              onOpenChange={setPairOpen}
              variant={isDesktop ? 'popover' : 'sheet'}
            />

            {/* Mobile: compact C + balance — account actions live in the drawer. */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1.5 md:hidden"
              title={t('nav.creditsTitle')}
            >
              <CreditIcon />
              <span className="min-w-[1ch] text-sm font-semibold tabular-nums text-amber-400">
                {creditBalance}
              </span>
            </div>

            {/* Desktop: credits opens account menu (no drawer on md+). */}
            <div className="relative hidden md:block" ref={creditsMenuRef}>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setCreditsMenuOpen((open) => !open)}
                aria-expanded={creditsMenuOpen}
                aria-haspopup="menu"
                aria-label={t('nav.accountMenu')}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1.5 transition hover:border-amber-400/40 hover:bg-surface-hover sm:px-3 sm:py-2"
                title={t('nav.creditsTitle')}
              >
                <CreditIcon size="md" />
                <span className="min-w-[1ch] text-sm font-semibold tabular-nums text-amber-400 sm:text-base">
                  {creditBalance}
                </span>
              </button>

              {creditsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-xl"
                >
                  <div role="none" className="border-b border-border px-2 py-2 empty:hidden">
                    <VerifyEmailNotice />
                  </div>
                  <div
                    role="none"
                    className="border-b border-border px-4 py-3 opacity-60"
                    title={t('nav.getCreditsSoon')}
                  >
                    <p className="text-sm text-text">{t('nav.getCredits')}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{t('nav.getCreditsSoon')}</p>
                  </div>
                  <div
                    role="none"
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
                  >
                    <span className="text-sm text-text">{t('nav.darkMode')}</span>
                    <ThemeToggle
                      checked={darkMode}
                      onChange={() => setDarkMode(!darkMode)}
                      label={t('nav.darkMode')}
                    />
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-text-muted transition hover:bg-surface-hover hover:text-text"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <NavDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onLogout={handleLogout}
        activeCreateRequestCount={activeCreateRequestCount}
      />
    </>
  )
}
