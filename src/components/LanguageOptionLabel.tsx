import type { Language } from '../data/mock'

type LanguageOptionLabelProps = {
  lang: Language
  /** 1-based index shown before the name. */
  index?: number
  selected?: boolean
}

/** Label hàng chọn ngôn ngữ: `{n}. {name}` + chip mã lang. */
export function LanguageOptionLabel({ lang, index, selected = false }: LanguageOptionLabelProps) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      {index != null ? (
        <span className="w-6 shrink-0 text-right tabular-nums text-text-muted">{index}.</span>
      ) : null}
      <span className="min-w-0 truncate">{lang.name}</span>
      <span
        className={[
          'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide',
          selected
            ? 'border-accent/40 bg-accent/15 text-accent'
            : 'border-border bg-surface text-text-muted',
        ].join(' ')}
      >
        {lang.code}
      </span>
    </span>
  )
}
