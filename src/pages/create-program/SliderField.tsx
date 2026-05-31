type SliderFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (value: number) => void
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: SliderFieldProps) {
  const safeMax = Math.max(min, max)

  return (
    <div className="rounded-xl border border-border bg-surface-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="shrink-0 text-sm tabular-nums text-text-muted">
          {value}
          {unit}
        </p>
      </div>
      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={Math.min(value, safeMax)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-3 w-full cursor-pointer accent-accent"
      />
    </div>
  )
}
