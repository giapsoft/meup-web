import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'

type CreateMode = {
  to: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  variant?: 'default' | 'primary'
  icon: ReactNode
}

function IconManual() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconTopic() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.8c.6.5 1 1.2 1.1 2V17h4.8v-1.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function IconImage() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="10" r="1.75" fill="currentColor" />
      <path
        d="M3 16l4.5-4 3 2.5L15 10l6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const CREATE_MODES: CreateMode[] = [
  {
    to: '/products/new/manual',
    titleKey: 'createHub.manual.title',
    descriptionKey: 'createHub.manual.description',
    variant: 'primary',
    icon: <IconManual />,
  },
  {
    to: '/products/new/ai/title',
    titleKey: 'createHub.aiTitle.title',
    descriptionKey: 'createHub.aiTitle.description',
    icon: <IconTopic />,
  },
  {
    to: '/products/new/ai/paragraph',
    titleKey: 'createHub.aiParagraph.title',
    descriptionKey: 'createHub.aiParagraph.description',
    icon: <IconText />,
  },
  {
    to: '/products/new/ai/image',
    titleKey: 'createHub.aiImage.title',
    descriptionKey: 'createHub.aiImage.description',
    icon: <IconImage />,
  },
]

function CreateModeCard({ mode }: { mode: CreateMode }) {
  const { t } = useLanguagePair()
  const isPrimary = mode.variant === 'primary'

  return (
    <Link
      to={mode.to}
      className={[
        'group flex min-h-[4.75rem] items-center gap-3 rounded-2xl border px-3.5 py-3 no-underline transition sm:gap-4 sm:px-4 sm:py-3.5',
        isPrimary
          ? 'border-accent/45 bg-accent-soft hover:border-accent hover:bg-accent/15'
          : 'border-border bg-surface-card hover:border-accent/35 hover:bg-surface-hover',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition',
          isPrimary
            ? 'bg-accent/20 text-accent group-hover:bg-accent/30'
            : 'bg-surface-raised text-text-muted group-hover:text-accent',
        ].join(' ')}
      >
        {mode.icon}
      </span>

      <div className="min-w-0 flex-1 text-left">
        <h2
          className={[
            'text-sm font-semibold tracking-tight sm:text-base',
            isPrimary ? 'text-accent' : 'text-text group-hover:text-accent',
          ].join(' ')}
        >
          {t(mode.titleKey)}
        </h2>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-muted sm:text-[13px]">
          {t(mode.descriptionKey)}
        </p>
      </div>

      <span
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition',
          isPrimary
            ? 'bg-accent/15 text-accent group-hover:bg-accent/25'
            : 'text-text-muted group-hover:bg-accent-soft group-hover:text-accent',
        ].join(' ')}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </Link>
  )
}

export function CreateProgramHubPage() {
  const { t } = useLanguagePair()

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 sm:mb-7">
        <p className="text-xs font-medium uppercase tracking-wide text-accent sm:text-sm">
          {t('createHub.badge')}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-text sm:text-2xl">
          {t('createHub.title')}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          {t('createHub.subtitle')}
        </p>
      </header>

      <div className="flex flex-col gap-2.5 sm:gap-3">
        {CREATE_MODES.map((mode) => (
          <CreateModeCard key={mode.to} mode={mode} />
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-2.5 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/products?tab=requests"
          className="inline-flex text-sm font-medium text-accent no-underline transition hover:underline"
        >
          {t('createHub.viewJobs')}
        </Link>
        <Link
          to="/products"
          className="inline-flex text-sm text-text-muted no-underline transition hover:text-accent"
        >
          {t('createHub.backProducts')}
        </Link>
      </div>
    </main>
  )
}
