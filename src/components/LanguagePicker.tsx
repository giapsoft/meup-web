import { findLanguage, type Language } from '../data/mock'

type LanguagePickerProps = {
  label: string
  hint: string
  value: string
  languages: Language[]
  onChange: (code: string) => void
}

export function LanguagePicker({
  label,
  hint,
  value,
  languages,
  onChange,
}: LanguagePickerProps) {
  const selected = findLanguage(value)

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label htmlFor={`lang-${label}`} className="block text-sm font-medium text-text">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-text-muted">{hint}</p>
      </div>

      <div className="relative">
        <select
          id={`lang-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-border bg-surface-card py-3 pl-4 pr-10 text-sm text-text shadow-sm transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-surface-card">
              {lang.flag} {lang.nativeName}
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

      {selected && (
        <p className="text-xs text-text-muted">
          Đang chọn: <span className="text-text">{selected.nativeName}</span> ({selected.name})
        </p>
      )}
    </div>
  )
}
