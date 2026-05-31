import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { useTheme } from '../context/ThemeProvider'
import { MOCK_DEVICE } from '../data/mock'

type HeaderProps = {
  onLogout: () => void
}

function ThemeToggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? 'border-accent bg-accent' : 'border-border bg-surface-hover'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}

export function Header({ onLogout }: HeaderProps) {
  const { t } = useLanguagePair()
  const { darkMode, setDarkMode } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    function onDocumentClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocumentClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function handleLogout() {
    setMenuOpen(false)
    onLogout()
  }

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

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t('nav.accountMenu')}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 transition hover:border-accent/40 hover:bg-surface-hover sm:px-4 sm:py-2"
            title={t('nav.creditsTitle')}
          >
            <span className="text-xs text-text-muted sm:text-sm">{t('nav.credits')}</span>
            <span className="text-sm font-semibold tabular-nums text-credit sm:text-base">
              {MOCK_DEVICE.creditsRemaining}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-xl"
            >
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
    </header>
  )
}
