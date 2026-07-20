import { ThemeToggle } from './ThemeToggle'
import { useLanguagePair } from '../context/LanguagePairProvider'

type DeviceSyncSwitchProps = {
  enabled: boolean
  busy?: boolean
  onChange: (next: boolean) => void
}

/** Compact on-device sync toggle — switch only on small screens to preserve card content width. */
export function DeviceSyncSwitch({ enabled, busy, onChange }: DeviceSyncSwitchProps) {
  const { t } = useLanguagePair()
  const label = t('products.deviceSync.label')

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden text-xs font-medium text-text-muted sm:inline">{label}</span>
      <ThemeToggle
        checked={enabled}
        label={label}
        onChange={() => {
          if (busy) return
          onChange(!enabled)
        }}
      />
    </div>
  )
}
