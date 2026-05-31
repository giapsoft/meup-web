import { resolveUiLocale, translate } from '../i18n/messages'
import type { TranslationKey } from '../i18n/types'

type StaticPageProps = {
  locale: string
}

function useStaticT(locale: string) {
  const uiLocale = resolveUiLocale(locale)
  return (key: TranslationKey) => translate(uiLocale, key)
}

export function AuthLoadingPage({ locale }: StaticPageProps) {
  const t = useStaticT(locale)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-accent"
        aria-hidden
      />
      <p className="text-sm text-text-muted">{t('auth.loading')}</p>
    </div>
  )
}

export function NotFoundPage({ locale }: StaticPageProps) {
  const t = useStaticT(locale)

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-semibold tabular-nums text-text-muted/40">404</p>
      <h1 className="mt-2 text-xl font-semibold text-text sm:text-2xl">
        {t('auth.notFoundTitle')}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted sm:text-base">
        {t('auth.notFoundMessage')}
      </p>
    </main>
  )
}
