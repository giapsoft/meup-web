import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getAccount, type AccountDto } from '../api/emailAuth'

function normalizeCreditBalance(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  return 0
}

type AccountContextValue = {
  creditBalance: number
  /** Linked device serial, or null when unknown / none. */
  deviceOrder: number | null
  refreshAccount: () => Promise<AccountDto | null>
  setCreditBalance: (balance: number) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

function normalizeDeviceOrder(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }
  return null
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [creditBalance, setCreditBalance] = useState(0)
  const [deviceOrder, setDeviceOrder] = useState<number | null>(null)

  const applyAccount = useCallback((account: AccountDto) => {
    setCreditBalance(normalizeCreditBalance(account.creditBalance))
    setDeviceOrder(normalizeDeviceOrder(account.deviceOrder))
  }, [])

  const refreshAccount = useCallback(async (): Promise<AccountDto | null> => {
    try {
      const account = await getAccount()
      applyAccount(account)
      return account
    } catch {
      setCreditBalance(0)
      setDeviceOrder(null)
      return null
    }
  }, [applyAccount])

  useEffect(() => {
    void refreshAccount()
  }, [refreshAccount])

  const value = useMemo(
    () => ({
      creditBalance,
      deviceOrder,
      refreshAccount,
      setCreditBalance,
    }),
    [creditBalance, deviceOrder, refreshAccount],
  )

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext)
  if (!ctx) {
    throw new Error('useAccount must be used within AccountProvider')
  }
  return ctx
}

/** Null outside AccountProvider (e.g. admin routes). */
export function useOptionalAccount(): AccountContextValue | null {
  return useContext(AccountContext)
}
