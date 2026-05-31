import { useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

function AppShell() {
  const [loggedIn, setLoggedIn] = useState(true)

  const handleLogout = useCallback(() => {
    setLoggedIn(false)
    window.alert('Mockup: đã đăng xuất. (Chưa có auth thật.)')
    setLoggedIn(true)
  }, [])

  if (!loggedIn) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 text-text-muted">
        Đã đăng xuất.
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/programs"
          element={
            <PlaceholderPage
              title="Chương trình của tôi"
              description="Danh sách chương trình học sẽ hiển thị ở đây — lọc theo cặp ngôn ngữ, tiến độ SRS, v.v."
            />
          }
        />
        <Route
          path="/programs/new"
          element={
            <PlaceholderPage
              title="Tạo chương trình mới"
              description="Wizard tạo bộ từ vựng và mẫu thẻ sẽ nằm ở trang này."
            />
          }
        />
        <Route
          path="/explore"
          element={
            <PlaceholderPage
              title="Khám phá chương trình"
              description="Thư viện chương trình cộng đồng và gói hệ thống sẽ hiển thị ở đây."
            />
          }
        />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
