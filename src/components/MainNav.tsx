import { Link, useLocation } from 'react-router-dom'
import { MAIN_NAV_ITEMS, isNavItemActive } from '../config/nav'
import { useLanguagePair } from '../context/LanguagePairProvider'

type MainNavProps = {
  /** Called after navigation (e.g. close mobile drawer). */
  onNavigate?: () => void
  className?: string
  linkClassName?: string
  activeLinkClassName?: string
}

export function MainNav({
  onNavigate,
  className = '',
  linkClassName = '',
  activeLinkClassName = '',
}: MainNavProps) {
  const { pathname } = useLocation()
  const { t } = useLanguagePair()

  return (
    <nav className={className} aria-label={t('nav.main')}>
      <ul className="flex flex-col gap-0.5 md:flex-row md:items-center md:gap-1">
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item)
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={[
                  'block rounded-lg px-3 py-2 text-sm font-medium no-underline transition',
                  active
                    ? activeLinkClassName || 'bg-accent-soft text-accent'
                    : linkClassName || 'text-text-muted hover:bg-surface-hover hover:text-text',
                ].join(' ')}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
