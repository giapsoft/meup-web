import { Route, Routes } from 'react-router-dom'
import { AdminConfigPage } from './AdminConfigPage'
import { AdminDefaultProgramConfigPage } from './AdminDefaultProgramConfigPage'
import { AdminGatePage } from './AdminGatePage'
import { AdminPanelPage } from './AdminPanelPage'

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminGatePage />} />
      <Route path="/admin/panel" element={<AdminPanelPage />} />
      <Route path="/admin/config" element={<AdminConfigPage />} />
      <Route
        path="/admin/default-program-config"
        element={<AdminDefaultProgramConfigPage />}
      />
    </Routes>
  )
}
