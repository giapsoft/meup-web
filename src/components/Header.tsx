import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    if (!accountMenuOpen) {
      return
    }
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as Node
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setAccountMenuOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (drawerOpen) {
      setPairOpen(false)
      setAccountMenuOpen(false)
    }
  }, [drawerOpen])

  useEffect(() => {
    if (pairOpen) {
      setDrawerOpen(false)
      setAccountMenuOpen(false)
    }
  }, [pairOpen])

  useEffect(() => {
    if (isDesktop) {
      setDrawerOpen(false)
    }
    setPairOpen(false)
  }, [isDesktop])

  function openDrawer() {
    void refreshActiveJobs()
    setDrawerOpen(true)
  }

  function handleLogout() {
    setAccountMenuOpen(false)
    setDrawerOpen(false)
    onLogout()
  }

  const creditsChipClass =
    'flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2 py-1 no-underline transition hover:border-amber-400/40 hover:bg-surface-hover sm:px-3 sm:py-2'

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-text transition hover:border-accent/40 sm:h-10 sm:w-10 md:hidden"
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

            <Link
              to="/credits"
              className={`${creditsChipClass} md:hidden`}
              title={t('nav.creditsTitle')}
              aria-label={t('nav.getCredits')}
            >
              <CreditIcon />
              <span className="min-w-[1ch] text-sm font-semibold tabular-nums text-amber-400">
                {creditBalance}
              </span>
            </Link>

            <div className="relative hidden items-center gap-2 md:flex" ref={accountMenuRef}>
              <Link
                to="/credits"
                className={creditsChipClass}
                title={t('nav.creditsTitle')}
                aria-label={t('nav.getCredits')}
              >
                <CreditIcon size="md" />
                <span className="min-w-[1ch] text-sm font-semibold tabular-nums text-amber-400 sm:text-base">
                  {creditBalance}
                </span>
              </Link>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label={t('nav.accountMenu')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-text transition hover:border-accent/40 hover:bg-surface-hover"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
                  <path
                    d="M5.5 18.5c1.6-2.6 3.9-4 6.5-4s4.9 1.4 6.5 4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-xl"
                >
                  <div role="none" className="border-b border-border px-2 py-2 empty:hidden">
                    <VerifyEmailNotice />
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
