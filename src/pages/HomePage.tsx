import { useMemo, useState } from 'react'
import { ActionCard } from '../components/ActionCard'
import { LanguagePicker } from '../components/LanguagePicker'
import { LANGUAGES, findLanguage } from '../data/mock'

export function HomePage() {
  const [nativeLang, setNativeLang] = useState('vi')
  const [studyLang, setStudyLang] = useState('en')

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
        <p className="text-sm font-medium text-accent">Chào mừng trở lại</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Quản lý từ vựng trên Tach
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
          Chọn cặp ngôn ngữ và truy cập chương trình học. Đây là mockup — dữ liệu và đăng nhập
          sẽ được nối sau.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-surface-raised p-4 sm:p-6">
        <h2 className="text-base font-semibold text-text sm:text-lg">Cặp ngôn ngữ</h2>
        <p className="mt-1 text-sm text-text-muted">
          Ngôn ngữ nguồn (bạn đang biết) và ngôn ngữ học (bạn muốn luyện).
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 sm:gap-6">
          <LanguagePicker
            label="Ngôn ngữ nguồn"
            hint="Ngôn ngữ bạn dùng để hiểu nghĩa"
            value={nativeLang}
            languages={LANGUAGES}
            onChange={setNativeLang}
          />
          <LanguagePicker
            label="Ngôn ngữ học"
            hint="Ngôn ngữ bạn muốn học từ vựng"
            value={studyLang}
            languages={LANGUAGES}
            onChange={setStudyLang}
          />
        </div>

        <div
          className={[
            'mt-5 rounded-xl border px-4 py-3 text-sm',
            sameLanguage
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-border bg-surface-card text-text-muted',
          ].join(' ')}
        >
          {sameLanguage ? (
            <>Hai ngôn ngữ đang trùng nhau — hãy chọn cặp khác nhau để học hiệu quả.</>
          ) : (
            <>
              Cặp đang chọn:{' '}
              <span className="font-medium text-text">{pairLabel}</span>
              <span className="ml-2 rounded-md bg-surface-raised px-2 py-0.5 text-xs tabular-nums">
                {nativeLang}_{studyLang}
              </span>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-text sm:text-lg">Chương trình học</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <ActionCard
            to="/programs"
            icon="📚"
            title="Chương trình của tôi"
            description="Xem và quản lý các bộ từ vựng bạn đã tạo hoặc đang học."
          />
          <ActionCard
            to="/programs/new"
            icon="✨"
            title="Tạo chương trình mới"
            description="Thiết kế bộ từ vựng mới với mẫu thẻ và trình tự phát."
            variant="primary"
          />
          <ActionCard
            to="/explore"
            icon="🧭"
            title="Khám phá chương trình"
            description="Duyệt thư viện chương trình cộng đồng và gói hệ thống."
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>
      </section>
    </main>
  )
}
