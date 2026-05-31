import { useEffect, useId, useState } from 'react'
import { COLOR_PALETTE } from '../../utils/colorPalette'

type ColorPickerFieldProps = {
  label: string
  value: string
  onChange: (color: string) => void
  customLabel: string
  chooseLabel: string
  doneLabel: string
  cancelLabel: string
}

function colorInputValue(hex: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex
  }
  if (/^#[0-9a-fA-F]{8}$/.test(hex)) {
    return hex.slice(0, 7)
  }
  return '#1a1a2e'
}

export function ColorPickerField({
  label,
  value,
  onChange,
  customLabel,
  chooseLabel,
  doneLabel,
  cancelLabel,
}: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const dialogTitleId = useId()

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  function closeDialog() {
    setOpen(false)
  }

  function applyAndClose() {
    onChange(draft)
    closeDialog()
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-card p-3">
        <p className="text-sm font-medium text-text">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 active:bg-surface-hover"
          aria-label={chooseLabel}
        >
          <span
            className="h-9 w-9 shrink-0 rounded-lg border border-border"
            style={{ backgroundColor: value }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-text">{value}</span>
          <span className="shrink-0 text-xs text-accent">{chooseLabel}</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closeDialog}
            aria-label={cancelLabel}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 shadow-xl sm:rounded-2xl sm:p-5"
          >
            <h3 id={dialogTitleId} className="text-base font-semibold text-text">
              {chooseLabel}
            </h3>
            <p className="mt-1 text-xs text-text-muted">{label}</p>

            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft(color)}
                  className={`aspect-square min-h-10 rounded-lg border-2 transition active:scale-95 ${
                    draft.toLowerCase() === color.toLowerCase()
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
            </div>

            <label className="mt-4 flex items-center gap-3">
              <span className="shrink-0 text-xs text-text-muted">{customLabel}</span>
              <input
                type="color"
                value={colorInputValue(draft)}
                onChange={(e) => setDraft(e.target.value)}
                className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
              />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 font-mono text-xs text-text"
                spellCheck={false}
              />
            </label>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="min-h-11 flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-muted active:bg-surface-hover"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={applyAndClose}
                className="min-h-11 flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-surface active:opacity-90"
              >
                {doneLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
