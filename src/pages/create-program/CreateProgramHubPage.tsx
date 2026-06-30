import { Link } from 'react-router-dom'
import { ActionCard } from '../../components/ActionCard'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'

type CreateMode = {
  to: string
  icon: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  variant?: 'default' | 'primary'
  soon?: boolean
}

const CREATE_MODES: CreateMode[] = [
  {
    to: '/programs/new/manual',
    icon: '✏️',
    titleKey: 'createHub.manual.title',
    descriptionKey: 'createHub.manual.description',
    variant: 'primary',
  },
  {
    to: '/programs/new/ai/title',
    icon: '💡',
    titleKey: 'createHub.aiTitle.title',
    descriptionKey: 'createHub.aiTitle.description',
  },
  {
    to: '/programs/new/ai/paragraph',
    icon: '📄',
    titleKey: 'createHub.aiParagraph.title',
    descriptionKey: 'createHub.aiParagraph.description',
    soon: true,
  },
  {
    to: '/programs/new/ai/image',
    icon: '🖼️',
    titleKey: 'createHub.aiImage.title',
    descriptionKey: 'createHub.aiImage.description',
    soon: true,
  },
]

export function CreateProgramHubPage() {
  const { t } = useLanguagePair()

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm font-medium text-accent">{t('createHub.badge')}</p>
      <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">{t('createHub.title')}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
        {t('createHub.subtitle')}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {CREATE_MODES.map((mode) => (
          <div key={mode.to} className="relative">
            {mode.soon && (
              <span className="absolute right-3 top-3 z-10 rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                {t('createHub.soonBadge')}
              </span>
            )}
            <ActionCard
              to={mode.to}
              icon={mode.icon}
              title={t(mode.titleKey)}
              description={t(mode.descriptionKey)}
              variant={mode.variant}
              className={mode.soon ? 'opacity-90' : undefined}
            />
          </div>
        ))}
      </div>

      <Link
        to="/programs"
        className="mt-8 inline-flex text-sm text-text-muted no-underline transition hover:text-accent"
      >
        {t('createHub.backPrograms')}
      </Link>
    </main>
  )
}
