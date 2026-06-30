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
  refreshAccount: () => Promise<AccountDto | null>
  setCreditBalance: (balance: number) => void
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [creditBalance, setCreditBalance] = useState(0)

  const applyAccount = useCallback((account: AccountDto) => {
    setCreditBalance(normalizeCreditBalance(account.creditBalance))
  }, [])

  const refreshAccount = useCallback(async (): Promise<AccountDto | null> => {
    try {
      const account = await getAccount()
      applyAccount(account)
      return account
    } catch {
      setCreditBalance(0)
      return null
    }
  }, [applyAccount])

  useEffect(() => {
    void refreshAccount()
  }, [refreshAccount])

  const value = useMemo(
    () => ({
      creditBalance,
      refreshAccount,
      setCreditBalance,
    }),
    [creditBalance, refreshAccount],
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
