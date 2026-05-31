import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { clearDeviceSession } from './utils/deviceSessionStorage'
import { useLanguagePair } from './context/LanguagePairProvider'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage, type PlaceholderPageKey } from './pages/PlaceholderPage'

function AppShell() {
  const [loggedIn, setLoggedIn] = useState(true)
  const { t } = useLanguagePair()

  const handleLogout = useCallback(() => {
    setLoggedIn(false)
    clearDeviceSession()
    window.alert(t('auth.logoutMock'))
    setLoggedIn(true)
  }, [t])

  if (!loggedIn) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 text-text-muted">
        {t('auth.loggedOut')}
      </div>
    )
  }

  const placeholders: { path: string; page: PlaceholderPageKey }[] = [
    { path: '/programs', page: 'programs' },
    { path: '/programs/new', page: 'programsNew' },
    { path: '/explore', page: 'explore' },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <Header onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        {placeholders.map(({ path, page }) => (
          <Route key={path} path={path} element={<PlaceholderPage page={page} />} />
        ))}
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppShell />
}
