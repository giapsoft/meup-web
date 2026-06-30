import type { TranslationKey } from '../i18n/types'

export type MainNavItem = {
  path: string
  labelKey: TranslationKey
  /** When set, pathname.startsWith this marks the item active (except `excludePrefix`). */
  activePrefix?: string
  /** Skip active match when pathname starts with this (e.g. /programs vs /programs/new). */
  excludePrefix?: string
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { path: '/', labelKey: 'nav.home' },
  {
    path: '/programs',
    labelKey: 'nav.programs',
    activePrefix: '/programs',
    excludePrefix: '/programs/new',
  },
  {
    path: '/programs/new',
    labelKey: 'nav.create',
    activePrefix: '/programs/new',
  },
  { path: '/explore', labelKey: 'nav.explore', activePrefix: '/explore' },
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
