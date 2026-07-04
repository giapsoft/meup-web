import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import { WIZARD_MAIN, WIZARD_NARROW_SECTION } from '../../pages/create-program/wizardLayout'

type AiCreatePageShellProps = {
  children: ReactNode
  title: string
  hint: string
  langPair: string
  successMessage?: string | null
  errorMessage?: string | null
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function AiCreatePageShell({
  children,
  title,
  hint,
  langPair,
  successMessage,
  errorMessage,
  t,
}: AiCreatePageShellProps) {
  return (
    <main className={WIZARD_MAIN}>
      <Link
        to="/products/new"
        className="inline-flex text-sm text-text-muted no-underline transition hover:text-accent"
      >
        {t('createProgram.hubBack')}
      </Link>
      <p className="mt-2 text-xs text-text-muted lg:text-sm">{t('createProgram.pairHint', { pair: langPair })}</p>

      {successMessage && (
        <div className="mt-4 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm text-text">
          <p>{successMessage}</p>
          <Link to="/products" className="mt-2 inline-block text-sm font-medium text-accent no-underline hover:underline">
            {t('createAi.viewRequests')}
          </Link>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning-muted px-4 py-3 text-sm text-warning">
          {errorMessage}
        </div>
      )}

      <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
        <h1 className="text-xl font-semibold text-text sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-text-muted">{hint}</p>
        {children}
      </section>
    </main>
  )
}
