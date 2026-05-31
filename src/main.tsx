import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { ThemeProvider } from './context/ThemeProvider.tsx'
import { DeviceSessionProvider } from './context/DeviceSessionProvider.tsx'
import { applyTheme, loadDarkMode } from './utils/themeStorage.ts'
import './index.css'

applyTheme(loadDarkMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DeviceSessionProvider>
          <App />
        </DeviceSessionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
