import { Link, useLocation } from 'react-router-dom'
import { MAIN_NAV_ITEMS, isNavItemActive } from '../config/nav'
import { useLanguagePair } from '../context/LanguagePairProvider'

type MainNavProps = {
  /** Called after navigation (e.g. close mobile drawer). */
  onNavigate?: () => void
  className?: string
  linkClassName?: string
  activeLinkClassName?: string
  /** Active create-request count shown on Library (`/products`). */
  activeCreateRequestCount?: number
  /** Pending invitation count for `Lời mời (N)`. */
  pendingInvitationCount?: number
}

export function MainNav({
  onNavigate,
  className = '',
  linkClassName = '',
  activeLinkClassName = '',
  activeCreateRequestCount = 0,
  pendingInvitationCount = 0,
}: MainNavProps) {
  const { pathname } = useLocation()
  const { t } = useLanguagePair()

  return (
    <nav className={className} aria-label={t('nav.main')}>
      <ul className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-1">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item)
          const showJobsBadge = item.path === '/products' && activeCreateRequestCount > 0
          const label =
            item.path === '/invitations'
              ? t('nav.invitationsWithCount', { count: pendingInvitationCount })
              : t(item.labelKey)
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition',
                  active
                    ? activeLinkClassName || 'bg-accent-soft text-accent'
                    : linkClassName || 'text-text-muted hover:bg-surface-hover hover:text-text',
                ].join(' ')}
              >
                <span>{label}</span>
                {showJobsBadge && (
                  <span
                    className="min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none tabular-nums text-white"
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
  )
}
