import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useLanguagePair } from '../context/LanguagePairProvider'

type ActionCardProps = {
  to: string
  icon: ReactNode
  title: string
  description: string
  variant?: 'default' | 'primary'
  className?: string
}

export function ActionCard({
  to,
  icon,
  title,
  description,
  variant = 'default',
  className = '',
}: ActionCardProps) {
  const { t } = useLanguagePair()
  const isPrimary = variant === 'primary'

  return (
    <Link
      to={to}
      className={[
        'group flex flex-col gap-3 rounded-2xl border p-4 no-underline transition sm:p-5',
        isPrimary
          ? 'border-accent/40 bg-accent-soft hover:border-accent hover:bg-accent/20'
          : 'border-border bg-surface-card hover:border-accent/30 hover:bg-surface-hover',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'flex h-11 w-11 items-center justify-center rounded-xl text-xl',
          isPrimary ? 'bg-accent/20 text-accent' : 'bg-surface-raised text-text',
        ].join(' ')}
        aria-hidden
      >
        {icon}
      </span>
      <div className="text-left">
        <h3
          className={[
            'text-base font-semibold sm:text-lg',
            isPrimary ? 'text-accent' : 'text-text group-hover:text-accent',
          ].join(' ')}
        >
          {title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      <span className="mt-auto text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
        {t('actionCard.open')}
      </span>
    </Link>
  )
}
