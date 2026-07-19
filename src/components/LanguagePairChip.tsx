import { useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { findLanguage, formatLanguageOption, LANGUAGES } from '../data/mock'
import { useLanguagePair } from '../context/LanguagePairProvider'

type LanguagePairChipProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `sheet` = mobile bottom sheet; `popover` = desktop dropdown */
  variant: 'sheet' | 'popover'
}

export function LanguagePairChip({ open, onOpenChange, variant }: LanguagePairChipProps) {
  const { studyLang, setStudyLang, t } = useLanguagePair()
  const titleId = useId()
  const listId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const label = useMemo(() => {
    const lang = findLanguage(studyLang)
    const name = lang?.name ?? studyLang
    return t('nav.studyChipLabel', { name })
  }, [studyLang, t])

  function close() {
    onOpenChange(false)
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  function selectStudy(code: string) {
    setStudyLang(code)
    close()
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

  const langList = (
    <ul id={listId} className="mt-3 flex flex-col gap-1.5" role="listbox" aria-labelledby={titleId}>
      {LANGUAGES.map((lang) => {
        const selected = lang.code === studyLang
        return (
          <li key={lang.code}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => selectStudy(lang.code)}
              className={[
                'flex min-h-11 w-full items-center rounded-xl border px-3 text-left text-sm font-medium transition sm:min-h-12 sm:px-4 sm:text-base',
                selected
                  ? 'border-accent/50 bg-accent-soft text-accent'
                  : 'border-border bg-surface-raised text-text hover:border-accent/40 hover:bg-surface-hover',
              ].join(' ')}
            >
              {formatLanguageOption(lang)}
            </button>
          </li>
        )
      })}
    </ul>
  )

  const panel = (
    <>
      <h2 id={titleId} className="text-sm font-semibold text-text sm:text-base">
        {t('nav.changeLanguagePair')}
      </h2>
      {langList}
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
              className="absolute inset-x-0 bottom-0 max-h-[min(90vh,36rem)] overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
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
        className="absolute right-0 top-full z-[60] mt-2 max-h-[min(70vh,28rem)] w-[min(100vw-2rem,22rem)] overflow-y-auto rounded-xl border border-border bg-surface-raised p-4 shadow-xl"
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
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => onOpenChange(!open)}
        className="flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1.5 text-xs font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover sm:max-w-none sm:px-3 sm:text-sm"
        title={t('nav.changeLanguagePair')}
      >
        <span className="truncate">{label}</span>
        <span className="text-text-muted" aria-hidden>
          ▾
        </span>
      </button>
      {popover}
      {sheet}
    </div>
  )
}
