import { useLanguagePair } from '../context/LanguagePairProvider'

type DeviceOrderChipProps = {
  deviceOrder: number
  /** Compact `#42` for tight mobile header; full label when roomy. */
  compact?: boolean
  className?: string
}

/** Always-visible device serial for the current session. */
export function DeviceOrderChip({ deviceOrder, compact, className }: DeviceOrderChipProps) {
  const { t } = useLanguagePair()
  const label = t('nav.deviceOrder', { order: deviceOrder })
  const short = t('nav.deviceOrderShort', { order: deviceOrder })

  return (
    <span
      className={[
        'inline-flex max-w-full items-center rounded-full border border-border bg-surface-raised px-2 py-1 text-sm font-semibold tabular-nums text-text sm:px-3 sm:py-2',
        className ?? '',
      ].join(' ')}
      title={label}
      aria-label={label}
    >
      <span className="truncate">{compact ? short : label}</span>
    </span>
  )
}
