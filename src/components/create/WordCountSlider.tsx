import { useEffect, useRef } from 'react'
import { App } from '../../app/App'

type WordCountSliderProps = {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  hint?: string
  decreaseLabel?: string
  increaseLabel?: string
}

const HOLD_DELAY_MS = 380
const HOLD_INTERVAL_MS = 55

function clampWordCount(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(value)))
}

function useHoldRepeat(onStep: () => void, enabled: boolean) {
  const delayRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const onStepRef = useRef(onStep)
  onStepRef.current = onStep

  function clear() {
    if (delayRef.current !== null) {
      window.clearTimeout(delayRef.current)
      delayRef.current = null
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => clear, [])

  useEffect(() => {
    if (!enabled) {
      clear()
    }
  }, [enabled])

  function start(e: React.PointerEvent<HTMLButtonElement>) {
    if (!enabled || e.button !== 0) {
      return
    }
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onStepRef.current()
    clear()
    delayRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        onStepRef.current()
      }, HOLD_INTERVAL_MS)
    }, HOLD_DELAY_MS)
  }

  function stop(e: React.PointerEvent<HTMLButtonElement>) {
    clear()
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

/** Word-count control: − / range / + (step 1), hold to repeat. */
export function WordCountSlider({
  id,
  label,
  value,
  onChange,
  hint,
  decreaseLabel = '−',
  increaseLabel = '+',
}: WordCountSliderProps) {
  const min = App.get().itemMinCount()
  const max = App.get().itemMaxCount()
  const safe = clampWordCount(value, min, max)
  const valueRef = useRef(safe)
  valueRef.current = safe

  function bump(delta: number) {
    const next = clampWordCount(valueRef.current + delta, min, max)
    if (next === valueRef.current) {
      return
    }
    valueRef.current = next
    onChange(next)
  }

  const decreaseHold = useHoldRepeat(() => bump(-1), safe > min)
  const increaseHold = useHoldRepeat(() => bump(1), safe < max)

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-text" htmlFor={id}>
          {label}
        </label>
        <span className="inline-flex min-w-[3.25rem] items-center justify-center rounded-xl border border-accent/45 bg-accent-soft px-3 py-1 text-2xl font-bold tabular-nums leading-none text-accent">
          {safe}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={safe <= min}
          aria-label={decreaseLabel}
          className="flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-xl border border-border bg-surface-card text-lg font-semibold text-text transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 select-none sm:h-11 sm:w-11"
          {...decreaseHold}
        >
          −
        </button>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={1}
          value={safe}
          onChange={(e) => {
            const next = clampWordCount(Number(e.target.value), min, max)
            valueRef.current = next
            onChange(next)
          }}
          className="h-3 min-w-0 flex-1 cursor-pointer accent-accent"
        />
        <button
          type="button"
          disabled={safe >= max}
          aria-label={increaseLabel}
          className="flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-xl border border-border bg-surface-card text-lg font-semibold text-text transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 select-none sm:h-11 sm:w-11"
          {...increaseHold}
        >
          +
        </button>
      </div>

      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  )
}

export function defaultWordCount(): number {
  return App.get().itemMinCount()
}
