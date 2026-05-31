import { Link } from 'react-router-dom'
import { useLanguagePair } from '../context/LanguagePairProvider'
import type { TranslationKey } from '../i18n/types'

export type PlaceholderPageKey = 'programs' | 'programsNew' | 'explore'

const TITLE_KEYS: Record<PlaceholderPageKey, TranslationKey> = {
  programs: 'placeholder.programs.title',
  programsNew: 'placeholder.programsNew.title',
  explore: 'placeholder.explore.title',
}

const DESCRIPTION_KEYS: Record<PlaceholderPageKey, TranslationKey> = {
  programs: 'placeholder.programs.description',
  programsNew: 'placeholder.programsNew.description',
  explore: 'placeholder.explore.description',
}

type PlaceholderPageProps = {
  page: PlaceholderPageKey
}

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  const { t } = useLanguagePair()

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-accent">{t('placeholder.badge')}</p>
      <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">
        {t(TITLE_KEYS[page])}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
        {t(DESCRIPTION_KEYS[page])}
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text no-underline transition hover:border-accent/40 hover:bg-surface-hover"
      >
        {t('placeholder.backHome')}
      </Link>
    </main>
  )
}
