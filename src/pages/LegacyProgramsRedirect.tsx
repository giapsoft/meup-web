import { Navigate, useLocation } from 'react-router-dom'
import { legacyProgramsRedirectPath } from '../config/nav'

/** Redirect old `/programs/*` bookmarks to `/products/*`. */
export function LegacyProgramsRedirect() {
  const { pathname } = useLocation()
  const target = legacyProgramsRedirectPath(pathname)
  if (!target) {
    return <Navigate to="/products" replace />
  }
  return <Navigate to={target} replace />
}
