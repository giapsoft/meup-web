type ThemeToggleProps = {
  checked: boolean
  onChange: () => void
  label: string
}

export function ThemeToggle({ checked, onChange, label }: ThemeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? 'border-accent bg-accent' : 'border-border bg-surface-hover'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
        aria-hidden="true"
      />
    </button>
  )
}
