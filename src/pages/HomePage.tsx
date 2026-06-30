import { useMemo } from 'react'
import { ActionCard } from '../components/ActionCard'
import { LanguagePicker } from '../components/LanguagePicker'
import { useLanguagePair } from '../context/LanguagePairProvider'
import { LANGUAGES, findLanguage } from '../data/mock'

export function HomePage() {
  const { nativeLang, studyLang, langPair, setNativeLang, setStudyLang, t } = useLanguagePair()

  const pairLabel = useMemo(() => {
    const native = findLanguage(nativeLang)
    const study = findLanguage(studyLang)
    if (!native || !study) return ''
    return `${native.nativeName} → ${study.nativeName}`
  }, [nativeLang, studyLang])

  const sameLanguage = nativeLang === studyLang

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="mb-8 sm:mb-10">
        <p className="text-sm font-medium text-accent">{t('home.welcome')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          {t('home.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          {t('home.subtitle')}
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-surface-raised p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text sm:text-lg">{t('languagePair.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('languagePair.subtitle')}</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-6">
          <LanguagePicker
            id="native-lang"
            label={t('languagePair.nativeLabel')}
            hint={t('languagePair.nativeHint')}
            value={nativeLang}
            languages={LANGUAGES}
            onChange={setNativeLang}
          />
          <LanguagePicker
            id="study-lang"
            label={t('languagePair.studyLabel')}
            hint={t('languagePair.studyHint')}
            value={studyLang}
            languages={LANGUAGES}
            onChange={setStudyLang}
          />
        </div>

        <div
          className={[
            'mt-5 rounded-xl border px-4 py-3 text-sm',
            sameLanguage
              ? 'border-warning/40 bg-warning-muted text-warning'
              : 'border-border bg-surface-card text-text-muted',
          ].join(' ')}
        >
          {sameLanguage ? (
            t('languagePair.sameWarning')
          ) : (
            <>
              {t('languagePair.currentPair', { pair: pairLabel })}
              <span className="ml-2 rounded-md bg-surface-raised px-2 py-0.5 text-xs tabular-nums">
                {langPair}
              </span>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-text sm:text-lg">
          {t('products.sectionTitle')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <ActionCard
            to="/products"
            icon="📚"
            title={t('products.my.title')}
            description={t('products.my.description')}
          />
          <ActionCard
            to="/products/new"
            icon="✨"
            title={t('products.new.title')}
            description={t('products.new.description')}
            variant="primary"
          />
          <ActionCard
            to="/explore"
            icon="🧭"
            title={t('products.explore.title')}
            description={t('products.explore.description')}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
      </section>
    </main>
  )
}
