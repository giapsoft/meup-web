import { useCallback } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Header } from './components/Header'
import { useClearDeviceSession, useReauthorize } from './context/DeviceSessionProvider'
import { useLanguagePair } from './context/LanguagePairProvider'
import { CreateProgramFromImagePage } from './pages/create-program/CreateProgramFromImagePage'
import { CreateProgramFromParagraphPage } from './pages/create-program/CreateProgramFromParagraphPage'
import { CreateProgramFromTitlePage } from './pages/create-program/CreateProgramFromTitlePage'
import { CreateProgramHubPage } from './pages/create-program/CreateProgramHubPage'
import { CreateProgramManualPage } from './pages/create-program/CreateProgramManualPage'
import { CreditsPage } from './pages/CreditsPage'
import { ExplorePage } from './pages/ExplorePage'
import { EditProgramPage } from './pages/edit-program/EditProgramPage'
import { ProductsPage } from './pages/ProductsPage'
import { InvitationsPage } from './pages/InvitationsPage'
import { PostLoginHomeRedirect } from './pages/PostLoginHomeRedirect'
import { LegacyProgramsRedirect } from './pages/LegacyProgramsRedirect'

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

  return (
    <div className="flex min-h-svh flex-col">
      <Header onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<PostLoginHomeRedirect />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/invitations" element={<InvitationsPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="/seller" element={<Navigate to="/" replace />} />
        {/* SellerPage ẩn tạm — bật lại khi sẵn sàng: element={<SellerPage />} */}
        <Route path="/products/new" element={<CreateProgramHubPage />} />
        <Route path="/products/new/manual" element={<CreateProgramManualPage key={uiLocale} />} />
        <Route path="/products/new/ai/title" element={<CreateProgramFromTitlePage key={uiLocale} />} />
        <Route path="/products/new/ai/paragraph" element={<CreateProgramFromParagraphPage key={uiLocale} />} />
        <Route path="/products/new/ai/image" element={<CreateProgramFromImagePage key={uiLocale} />} />
        <Route path="/products/new/ai/:mode" element={<Navigate to="/products/new" replace />} />
        <Route path="/products/:productId/edit" element={<EditProgramPage />} />
        <Route path="/programs/*" element={<LegacyProgramsRedirect />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppShell />
}
