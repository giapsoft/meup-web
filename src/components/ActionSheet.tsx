import { useEffect, useId, useRef } from 'react'
import { useLanguagePair } from '../context/LanguagePairProvider'

export type ActionSheetItem = {
  id: string
  label: string
  onSelect: () => void
  variant?: 'default' | 'accent'
}

type ActionSheetProps = {
  open: boolean
  title: string
  items: ActionSheetItem[]
  onClose: () => void
}

/** Mobile-friendly bottom sheet for secondary actions. */
export function ActionSheet({ open, title, items, onClose }: ActionSheetProps) {
  const { t } = useLanguagePair()
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t('nav.closeMenu')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border bg-surface-raised pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="truncate text-sm font-semibold text-text">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text"
            aria-label={t('nav.closeMenu')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <ul className="p-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  item.onSelect()
                }}
                className={[
                  'w-full rounded-xl px-4 py-3.5 text-left text-sm font-medium transition hover:bg-surface-hover',
                  item.variant === 'accent' ? 'text-accent' : 'text-text',
                ].join(' ')}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
