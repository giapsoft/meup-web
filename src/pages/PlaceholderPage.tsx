import { Link } from 'react-router-dom'

type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-accent">Mockup</p>
      <h1 className="mt-1 text-2xl font-semibold text-text sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted sm:text-base">
        {description}
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text no-underline transition hover:border-accent/40 hover:bg-surface-hover"
      >
        ← Về trang chủ
      </Link>
    </main>
  )
}
