import { formatLanguageOption, type Language } from '../data/mock'

type LanguagePickerProps = {
  id: string
  label: string
  hint: string
  value: string
  languages: Language[]
  onChange: (code: string) => void
}

export function LanguagePicker({
  id,
  label,
  hint,
  value,
  languages,
  onChange,
}: LanguagePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-text">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
      </div>

      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-surface-card py-3 pl-4 pr-10 text-sm text-text shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-surface-card">
              {formatLanguageOption(lang)}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
          aria-hidden
        >
          ▾
        </span>
      </div>
    </div>
  )
}
