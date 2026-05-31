import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyTheme, loadDarkMode, saveDarkMode } from '../utils/themeStorage'

type ThemeContextValue = {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(loadDarkMode)

  useEffect(() => {
    applyTheme(darkMode)
    saveDarkMode(darkMode)
  }, [darkMode])

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => !prev)
  }, [])

  const value = useMemo(
    () => ({ darkMode, setDarkMode, toggleDarkMode }),
    [darkMode, setDarkMode, toggleDarkMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
