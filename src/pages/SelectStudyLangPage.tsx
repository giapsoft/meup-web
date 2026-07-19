import { LANGUAGES } from '../data/mock'
import { LanguageOptionLabel } from '../components/LanguageOptionLabel'

type SelectStudyLangPageProps = {
  title: string
  hint: string
  onSelect: (code: string) => void
}

/** Full-page danh sách ngôn ngữ — chọn StudyLang (QR không mang study). */
export function SelectStudyLangPage({ title, hint, onSelect }: SelectStudyLangPageProps) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-4 py-8 sm:py-12">
      <h1 className="text-xl font-semibold text-text sm:text-2xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-muted sm:text-base">{hint}</p>
      <ul className="mt-6 flex flex-col gap-2" role="listbox" aria-label={title}>
        {LANGUAGES.map((lang, index) => (
          <li key={lang.code}>
            <button
              type="button"
              role="option"
              onClick={() => onSelect(lang.code)}
              className="flex min-h-12 w-full items-center rounded-xl border border-border bg-surface-raised px-4 text-left text-sm font-medium text-text transition hover:border-accent/40 hover:bg-surface-hover sm:text-base"
            >
              <LanguageOptionLabel lang={lang} index={index + 1} />
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
