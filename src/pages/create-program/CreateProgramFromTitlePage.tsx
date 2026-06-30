import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getAccount } from '../../api/emailAuth'
import {
  createProductRequest,
  pollProductCreateProgressWithUpdates,
  type ProductCreateProgressDto,
} from '../../api/productCreate'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import type { ItemSchemaEditorState, LevelRangeDraft, SchemaFieldUiType } from '../../types/program'
import {
  AI_VOCAB_MAX_WORD_COUNT,
  AI_VOCAB_MIN_WORD_COUNT,
  parseWordCountInput,
  validateWordCountInput,
} from '../../utils/aiVocabWordCount'
import { toProductCreatePayloadString } from '../../utils/compactProgramConfig'
import { buildDefaultLevels } from '../../utils/defaultSides'
import { schemaHasLangRole } from '../../utils/itemSchemaLayout'
import { buildVocabJob, estimateVocabJobCredits } from '../../utils/productCreateJobs'
import {
  createPresetItemSchemaEditor,
  itemSchemaFromEditor,
  slugProgramId,
} from '../../utils/schemaField'
import { aiVocabErrorMessage } from './aiVocabError'
import { ItemSchemaEditor } from './ItemSchemaEditor'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_MAIN,
  WIZARD_NARROW_SECTION,
} from './wizardLayout'

type Step = 'setup' | 'schema' | 'review' | 'done'

type SubmitState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'processing'; requestId: string; totalCredits: number }
  | { phase: 'success'; requestId: string; totalCredits: number }
  | { phase: 'failed'; message: string }

const FIELD_TYPE_KEYS: Record<SchemaFieldUiType, TranslationKey> = {
  text: 'createProgram.fieldType.text',
  'text+audio': 'createProgram.fieldType.textAudio',
}

export function CreateProgramFromTitlePage() {
  const { nativeLang, studyLang, langPair, t } = useLanguagePair()

  const [step, setStep] = useState<Step>('setup')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [wordCountText, setWordCountText] = useState('')
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [nameError, setNameError] = useState('')
  const [topicError, setTopicError] = useState('')
  const [wordCountError, setWordCountError] = useState('')
  const [itemSchemaEditor, setItemSchemaEditor] = useState<ItemSchemaEditorState>(() =>
    createPresetItemSchemaEditor(t),
  )
  const [levels, setLevels] = useState<LevelRangeDraft[]>([])
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' })
  const [liveProgress, setLiveProgress] = useState<ProductCreateProgressDto | null>(null)

  const itemSchema = useMemo(() => itemSchemaFromEditor(itemSchemaEditor), [itemSchemaEditor])
  const programId = useMemo(() => slugProgramId(name), [name])
  const estimatedCredits = useMemo(() => {
    const parsed = parseWordCountInput(wordCountText)
    if (parsed === null || parsed < AI_VOCAB_MIN_WORD_COUNT) {
      return null
    }
    return estimateVocabJobCredits(parsed)
  }, [wordCountText])

  function handleContinueSetup() {
    const trimmedName = name.trim()
    const trimmedTopic = topic.trim()
    let valid = true
    if (!trimmedName) {
      setNameError(t('createProgram.validation.nameRequired'))
      valid = false
    } else {
      setNameError('')
    }
    if (!trimmedTopic) {
      setTopicError(t('createAiTitle.validation.topicRequired'))
      valid = false
    } else {
      setTopicError('')
    }
    const wordCountResult = validateWordCountInput(wordCountText, t)
    if (!wordCountResult.ok) {
      setWordCountError(wordCountResult.message)
      valid = false
    } else {
      setWordCountError('')
      setWordCount(wordCountResult.value)
    }
    if (!valid) {
      return
    }
    setStep('schema')
  }

  function handleContinueSchema() {
    const valid = itemSchemaEditor.fields.every((f) => f.name.trim())
    if (!valid || itemSchemaEditor.fields.length === 0) {
      window.alert(t('createProgram.validation.fieldsRequired'))
      return
    }
    if (!schemaHasLangRole(itemSchema)) {
      window.alert(t('createProgram.validation.schemaLangRequired'))
      return
    }
    setLevels(buildDefaultLevels(itemSchema))
    setStep('review')
  }

  async function handleSubmit() {
    setStep('done')
    setSubmitState({ phase: 'submitting' })
    setLiveProgress(null)

    const payload = toProductCreatePayloadString(itemSchema, levels, [])
    const job = buildVocabJob('fromTitle', topic, wordCount ?? AI_VOCAB_MIN_WORD_COUNT)

    try {
      const account = await getAccount()
      const created = await createProductRequest({
        ownerId: account.userId,
        productName: name.trim(),
        productDescription: '',
        nativeLangId: nativeLang,
        studyLangId: studyLang,
        payload,
        jobs: [job],
      })

      setSubmitState({
        phase: 'processing',
        requestId: created.id,
        totalCredits: created.totalCredits,
      })

      const finalProgress = await pollProductCreateProgressWithUpdates(
        created.id,
        setLiveProgress,
        { maxAttempts: 180 },
      )
      if (finalProgress.status === 'success') {
        setSubmitState({
          phase: 'success',
          requestId: created.id,
          totalCredits: created.totalCredits,
        })
      } else {
        setSubmitState({
          phase: 'failed',
          message: finalProgress.status,
        })
      }
    } catch (err) {
      const message = err instanceof ApiError ? aiVocabErrorMessage(err.code, t) : 'request_failed'
      setSubmitState({ phase: 'failed', message })
    }
  }

  return (
    <main className={WIZARD_MAIN}>
      <Link
        to="/products/new"
        className="inline-flex text-sm text-text-muted no-underline transition hover:text-accent"
      >
        {t('createProgram.hubBack')}
      </Link>
      <p className="mt-2 text-xs text-text-muted lg:text-sm">{t('createProgram.pairHint', { pair: langPair })}</p>

      {step !== 'done' && (
        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {(['setup', 'schema', 'review'] as const).map((s, index) => {
            const active = step === s
            const done =
              (step === 'schema' && s === 'setup') ||
              (step === 'review' && (s === 'setup' || s === 'schema'))
            return (
              <li
                key={s}
                className={[
                  'rounded-full px-3 py-1 font-medium',
                  active
                    ? 'bg-accent-soft text-accent'
                    : done
                      ? 'bg-surface-card text-text-muted'
                      : 'bg-surface-raised text-text-muted/60',
                ].join(' ')}
              >
                {index + 1}. {t(`createAiTitle.step.${s}` as TranslationKey)}
              </li>
            )
          })}
        </ol>
      )}

      {step === 'setup' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createAiTitle.setup.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiTitle.setup.hint')}</p>

          <label className="mt-6 block text-sm font-medium text-text" htmlFor="ai-title-program-name">
            {t('createProgram.stepName.label')}
          </label>
          <input
            id="ai-title-program-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('createProgram.stepName.placeholder')}
            className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
          />
          {nameError && <p className="mt-2 text-sm text-warning">{nameError}</p>}

          <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-title-topic">
            {t('createAiTitle.setup.topicLabel')}
          </label>
          <input
            id="ai-title-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('createAiTitle.setup.topicPlaceholder')}
            className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
          />
          {topicError && <p className="mt-2 text-sm text-warning">{topicError}</p>}

          <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-title-word-count">
            {t('createAiTitle.setup.wordCountLabel')}
          </label>
          <input
            id="ai-title-word-count"
            type="number"
            min={AI_VOCAB_MIN_WORD_COUNT}
            max={AI_VOCAB_MAX_WORD_COUNT}
            step={1}
            inputMode="numeric"
            value={wordCountText}
            onChange={(e) => {
              setWordCountText(e.target.value)
              if (wordCountError) {
                setWordCountError('')
              }
            }}
            placeholder={t('createAiTitle.setup.wordCountPlaceholder')}
            className="mt-2 w-full max-w-[8rem] rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
          />
          {wordCountError && <p className="mt-2 text-sm text-warning">{wordCountError}</p>}
          <p className="mt-1 text-xs text-text-muted">
            {t('createAiTitle.setup.wordCountHint', {
              min: AI_VOCAB_MIN_WORD_COUNT,
              max: AI_VOCAB_MAX_WORD_COUNT,
            })}
          </p>
          {estimatedCredits != null && (
            <p className="mt-2 text-xs text-text-muted">
              {t('createAiTitle.setup.creditsEstimate', { credits: estimatedCredits })}
            </p>
          )}

          <div className={`${WIZARD_ACTIONS} sm:justify-end`}>
            <button type="button" onClick={handleContinueSetup} className={WIZARD_ACTION_PRIMARY}>
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </section>
      )}

      {step === 'schema' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createProgram.stepSchema.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiTitle.schema.hint')}</p>
          <p className="mt-1 text-xs text-text-muted">{name}</p>

          <ItemSchemaEditor
            value={itemSchemaEditor}
            onChange={setItemSchemaEditor}
            fieldTypeKeys={FIELD_TYPE_KEYS}
            t={t}
          />

          <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
            <button type="button" onClick={() => setStep('setup')} className={WIZARD_ACTION_SECONDARY}>
              {t('createProgram.stepSchema.back')}
            </button>
            <button type="button" onClick={handleContinueSchema} className={WIZARD_ACTION_PRIMARY}>
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createAiTitle.review.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiTitle.review.hint')}</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">{t('createProgram.stepName.label')}</dt>
              <dd className="font-medium text-text">{name.trim()}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.setup.topicLabel')}</dt>
              <dd className="font-medium text-text">{topic.trim()}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.setup.wordCountLabel')}</dt>
              <dd className="font-medium text-text">{wordCount ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.review.jobType')}</dt>
              <dd className="font-mono text-xs text-text">vocab · fromTitle</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.review.credits')}</dt>
              <dd className="font-medium tabular-nums text-credit">
                {wordCount != null
                  ? t('createAiTitle.review.creditsValue', { credits: estimateVocabJobCredits(wordCount) })
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">ID</dt>
              <dd className="font-mono text-text">{programId}</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-xl border border-border bg-surface-card px-3 py-2 text-xs text-text-muted">
            {t('createAiTitle.review.mediaNote')}
          </p>

          <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
            <button type="button" onClick={() => setStep('schema')} className={WIZARD_ACTION_SECONDARY}>
              {t('createProgram.stepSchema.back')}
            </button>
            <button type="button" onClick={handleSubmit} className={WIZARD_ACTION_PRIMARY}>
              {t('createAiTitle.review.submit')}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {submitState.phase === 'submitting' || submitState.phase === 'processing'
              ? t('createAiTitle.done.processingTitle')
              : submitState.phase === 'success'
                ? t('createProgram.stepDone.title')
                : submitState.phase === 'failed'
                  ? t('createProgram.stepDone.failedTitle')
                  : t('createProgram.stepDone.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {submitState.phase === 'submitting'
              ? t('createProgram.stepDone.submittingHint')
              : submitState.phase === 'processing'
                ? t('createAiTitle.done.processingHint')
                : submitState.phase === 'success'
                  ? t('createAiTitle.done.successHint')
                  : submitState.phase === 'failed'
                    ? submitState.message
                    : t('createProgram.stepDone.subtitle')}
          </p>

          {(submitState.phase === 'processing' || submitState.phase === 'success') && (
            <p className="mt-2 font-mono text-xs text-text-muted">
              {t('createProgram.stepDone.requestId', { id: submitState.requestId })}
            </p>
          )}

          {submitState.phase === 'processing' && liveProgress && (
            <div className="mt-4 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm">
              {liveProgress.progressPercent != null ? (
                <p className="font-medium text-text">
                  {t('createAiTitle.done.progressPercent', { percent: liveProgress.progressPercent })}
                </p>
              ) : liveProgress.jobs ? (
                <ul className="space-y-1 text-xs text-text-muted">
                  <li>{t('createAiTitle.done.jobsSuccess', { count: liveProgress.jobs.success })}</li>
                  <li>{t('createAiTitle.done.jobsWorking', { count: liveProgress.jobs.working })}</li>
                  <li>{t('createAiTitle.done.jobsPending', { count: liveProgress.jobs.pending })}</li>
                  {liveProgress.jobs.failed > 0 && (
                    <li className="text-warning">
                      {t('createAiTitle.done.jobsFailed', { count: liveProgress.jobs.failed })}
                    </li>
                  )}
                </ul>
              ) : null}
            </div>
          )}

          {submitState.phase === 'success' && (
            <p className="mt-2 text-sm text-text-muted">
              {t('createAiTitle.done.creditsCharged', { credits: submitState.totalCredits })}
            </p>
          )}

          <Link
            to="/products/new"
            className={`mt-6 lg:max-w-xs ${WIZARD_ACTION_SECONDARY} inline-flex items-center justify-center no-underline`}
          >
            {t('createHub.backHub')}
          </Link>
        </section>
      )}
    </main>
  )
}
