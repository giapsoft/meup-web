import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import { clearAdminSecret, loadAdminSecret } from '../../utils/adminSecretStorage'

type NavItem = {
  to: string
  labelKey: TranslationKey
  end?: boolean
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
    'block rounded-lg px-3 py-2 text-sm font-medium no-underline transition',
    isActive
      ? 'bg-surface-card text-text shadow-sm'
      : 'text-text-muted hover:bg-surface-hover hover:text-text',
  ].join(' ')

/** Shared shell: left nav + content outlet for all authenticated admin pages. */
export function AdminLayout() {
  const { t } = useLanguagePair()
  const navigate = useNavigate()
  const secret = loadAdminSecret()

  if (!secret) {
    return <Navigate to="/admin" replace />
  }

  function handleExit() {
    clearAdminSecret()
    navigate('/admin', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface md:flex-row">
      <aside className="shrink-0 border-b border-border bg-surface-raised md:sticky md:top-0 md:flex md:h-svh md:w-56 md:flex-col md:border-b-0 md:border-r lg:w-60">
        <div className="flex items-center justify-between gap-2 px-3 py-3 md:block md:px-4 md:py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-warning">Admin</p>
            <h1 className="text-base font-semibold text-text md:mt-0.5 md:text-lg">
              {t('admin.panel.title')}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleExit}
            className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-muted transition hover:border-warning/40 hover:text-text md:mt-3 md:w-full md:px-3 md:py-2 md:text-sm"
          >
            {t('admin.panel.exit')}
          </button>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:px-3 md:pb-4"
          aria-label={t('admin.tabsLabel')}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              <span className="whitespace-nowrap">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
