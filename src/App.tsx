import { useCallback } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { VerifyEmailBanner } from './components/VerifyEmailBanner'
import { useClearDeviceSession, useReauthorize } from './context/DeviceSessionProvider'
import { useLanguagePair } from './context/LanguagePairProvider'
import { HomePage } from './pages/HomePage'
import { CreateProgramAiSoonPage } from './pages/create-program/CreateProgramAiSoonPage'
import { CreateProgramFromImagePage } from './pages/create-program/CreateProgramFromImagePage'
import { CreateProgramFromParagraphPage } from './pages/create-program/CreateProgramFromParagraphPage'
import { CreateProgramFromTitlePage } from './pages/create-program/CreateProgramFromTitlePage'
import { CreateProgramHubPage } from './pages/create-program/CreateProgramHubPage'
import { CreateProgramWizard } from './pages/create-program/CreateProgramWizard'
import { PlaceholderPage, type PlaceholderPageKey } from './pages/PlaceholderPage'

function AppShell() {
  const { uiLocale } = useLanguagePair()
  const navigate = useNavigate()
  const clearSession = useClearDeviceSession()
  const reauthorize = useReauthorize()

  const handleLogout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
    reauthorize()
  }, [clearSession, navigate, reauthorize])

  const placeholders: { path: string; page: PlaceholderPageKey }[] = [
    { path: '/programs', page: 'programs' },
    { path: '/explore', page: 'explore' },
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <Header onLogout={handleLogout} />
      <VerifyEmailBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programs/new" element={<CreateProgramHubPage />} />
        <Route path="/programs/new/manual" element={<CreateProgramWizard key={uiLocale} />} />
        <Route path="/programs/new/ai/title" element={<CreateProgramFromTitlePage key={uiLocale} />} />
        <Route path="/programs/new/ai/paragraph" element={<CreateProgramFromParagraphPage key={uiLocale} />} />
        <Route path="/programs/new/ai/image" element={<CreateProgramFromImagePage key={uiLocale} />} />
        <Route path="/programs/new/ai/:mode" element={<CreateProgramAiSoonPage />} />
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
