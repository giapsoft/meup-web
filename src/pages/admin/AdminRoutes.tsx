import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminConfigPage } from './AdminConfigPage'
import { AdminDefaultProgramConfigPage } from './AdminDefaultProgramConfigPage'
import { AdminGatePage } from './AdminGatePage'
import { AdminLayout } from './AdminLayout'
import { AdminPanelPage } from './AdminPanelPage'

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminGatePage />} />

      <Route path="/admin/panel" element={<AdminLayout />}>
        <Route index element={<Navigate to="balances" replace />} />
        <Route path="config" element={<AdminConfigPage />} />
        <Route path="default-program-config" element={<AdminDefaultProgramConfigPage />} />
        <Route path=":section" element={<AdminPanelPage />} />
      </Route>

      {/* Legacy URLs */}
      <Route path="/admin/config" element={<Navigate to="/admin/panel/config" replace />} />
      <Route
        path="/admin/default-program-config"
        element={<Navigate to="/admin/panel/default-program-config" replace />}
      />
    </Routes>
  )
}
