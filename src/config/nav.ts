import type { TranslationKey } from '../i18n/types'

export type MainNavItem = {
  path: string
  labelKey: TranslationKey
  /** When set, pathname.startsWith this marks the item active (except `excludePrefix`). */
  activePrefix?: string
  /** Skip active match when pathname starts with this (e.g. /products vs /products/new). */
  excludePrefix?: string
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  {
    path: '/products',
    labelKey: 'nav.products',
    activePrefix: '/products',
    excludePrefix: '/products/new',
  },
  { path: '/explore', labelKey: 'nav.explore', activePrefix: '/explore' },
  // Earn /seller — ẩn tạm thời (bật lại khi sẵn sàng)
]

export function isNavItemActive(pathname: string, item: MainNavItem): boolean {
  if (item.activePrefix) {
    if (!pathname.startsWith(item.activePrefix)) {
      return false
    }
    if (item.excludePrefix && pathname.startsWith(item.excludePrefix)) {
      return false
    }
    return true
  }
  return pathname === item.path
}

/** Legacy `/programs/*` paths from early web mockups. */
export function legacyProgramsRedirectPath(pathname: string): string | null {
  if (!pathname.startsWith('/programs')) {
    return null
  }
  return pathname.replace(/^\/programs/, '/products')
}
