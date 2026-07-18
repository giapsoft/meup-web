import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LANGUAGES } from '../data/mock'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { LanguagePicker } from './LanguagePicker'

type LanguagePairPanelProps = {
  className?: string
}

export function LanguagePairPanel({ className = '' }: LanguagePairPanelProps) {
  const { nativeLang, studyLang, setNativeLang, setStudyLang, t } = useLanguagePair()
  const sameLanguage = nativeLang === studyLang

  return (
    <div className={className}>
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
        <LanguagePicker
          id="pair-panel-native"
          label={t('languagePair.nativeLabel')}
          hint={t('languagePair.nativeHint')}
          value={nativeLang}
          languages={LANGUAGES}
          onChange={setNativeLang}
        />
        <LanguagePicker
          id="pair-panel-study"
          label={t('languagePair.studyLabel')}
          hint={t('languagePair.studyHint')}
          value={studyLang}
          languages={LANGUAGES}
          onChange={setStudyLang}
        />
      </div>

      {sameLanguage ? (
        <p className="mt-3 text-sm text-warning">{t('languagePair.sameWarning')}</p>
      ) : null}
    </div>
  )
}

type LanguagePairChipProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `sheet` = mobile bottom sheet; `popover` = desktop dropdown */
  variant: 'sheet' | 'popover'
}

export function LanguagePairChip({ open, onOpenChange, variant }: LanguagePairChipProps) {
  const { nativeLang, studyLang, t } = useLanguagePair()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const label = `${nativeLang} → ${studyLang}`

  function close() {
    onOpenChange(false)
    // Restore focus after overlay unmounts.
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false)
        window.setTimeout(() => triggerRef.current?.focus(), 0)
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (variant !== 'popover' || !panelRef.current || !triggerRef.current) {
        return
      }
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      // Native <select> menus render outside the panel — don't treat as "outside click".
      if (target instanceof Element && target.closest('select, option')) {
        return
      }
      if (!panelRef.current.contains(target) && !triggerRef.current.contains(target)) {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, onOpenChange, variant])

  useEffect(() => {
    if (!open) {
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const panel = (
    <>
      <h2 id={titleId} className="text-sm font-semibold text-text sm:text-base">
        {t('nav.changeLanguagePair')}
      </h2>
      <LanguagePairPanel className="mt-3" />
      <button
        type="button"
        onClick={close}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-accent/40 bg-accent-soft text-sm font-semibold text-accent transition hover:border-accent hover:bg-accent/20"
      >
        {t('nav.pairDone')}
      </button>
    </>
  )

  const sheet =
    open && variant === 'sheet'
      ? createPortal(
          <div className="fixed inset-0 z-[70]" role="presentation">
            <div className="absolute inset-0 bg-black/45" aria-hidden onClick={close} />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute inset-x-0 bottom-0 max-h-[min(90vh,32rem)] overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
            >
              <div className="mb-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={close}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface-hover hover:text-text"
                  aria-label={t('nav.closeMenu')}
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
              {panel}
            </div>
          </div>,
          document.body,
        )
      : null

  const popover =
    open && variant === 'popover' ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-surface-raised p-4 shadow-xl"
      >
        {panel}
      </div>
    ) : null

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        className="flex max-w-[9.5rem] items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover sm:max-w-none sm:px-3 sm:text-sm"
        title={t('nav.changeLanguagePair')}
      >
        <span className="truncate tabular-nums">{label}</span>
        <span className="text-text-muted" aria-hidden>
          ▾
        </span>
      </button>
      {popover}
      {sheet}
    </div>
  )
}
