import { Link, Navigate, useParams } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'

const AI_MODE_KEYS: Record<string, { title: TranslationKey; description: TranslationKey }> = {
  title: {
    title: 'createHub.aiTitle.title',
    description: 'createHub.aiTitle.description',
  },
  paragraph: {
    title: 'createHub.aiParagraph.title',
    description: 'createHub.aiParagraph.description',
  },
  image: {
    title: 'createHub.aiImage.title',
    description: 'createHub.aiImage.description',
  },
}

export function CreateProgramAiSoonPage() {
  const { mode } = useParams<{ mode: string }>()
  const { t } = useLanguagePair()

  const keys = mode ? AI_MODE_KEYS[mode] : undefined
  if (!keys) {
    return <Navigate to="/products/new" replace />
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-accent">{t('createHub.soonBadge')}</p>
      <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">{t(keys.title)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-base">{t(keys.description)}</p>
      <p className="mt-4 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text-muted">
        {t('createHub.aiSoonBody')}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/products/new/manual"
          className="inline-flex rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent no-underline transition hover:bg-accent/20"
        >
          {t('createHub.manualCta')}
        </Link>
        <Link
          to="/products/new"
          className="inline-flex rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text no-underline transition hover:border-accent/40"
        >
          {t('createHub.backHub')}
        </Link>
      </div>
    </main>
  )
}
