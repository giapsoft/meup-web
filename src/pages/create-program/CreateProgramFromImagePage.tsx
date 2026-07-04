import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import {
  createProductRequest,
  pollProductCreateProgressWithUpdates,
  type ProductCreateProgressDto,
} from '../../api/productCreate'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useAccount } from '../../context/AccountProvider'
import type { TranslationKey } from '../../i18n/types'
import type { ItemSchemaEditorState, LevelRangeDraft, SchemaFieldUiType } from '../../types/program'
import { App } from '../../app/App'
import {
  parseWordCountInput,
  validateWordCountInput,
} from '../../utils/aiVocabWordCount'
import {
  compressImageFile,
  compressedImagePreviewUrl,
  formatByteSize,
  isAcceptedImageFile,
  type CompressedImage,
} from '../../utils/compressImageForApi'
import { buildDefaultLevels } from '../../utils/defaultSides'
import { estimateAIVocabCredits } from '../../utils/pricing'
import { programConfigWebFromEditor } from '../../utils/programConfigWeb'
import { schemaHasLangRole } from '../../utils/itemSchemaLayout'
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

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export function CreateProgramFromImagePage() {
  const { nativeLang, studyLang, langPair, t } = useLanguagePair()
  const { refreshAccount } = useAccount()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('setup')
  const [name, setName] = useState('')
  const [image, setImage] = useState<CompressedImage | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [wordCountText, setWordCountText] = useState('')
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [nameError, setNameError] = useState('')
  const [imageError, setImageError] = useState('')
  const [wordCountError, setWordCountError] = useState('')
  const [itemSchemaEditor, setItemSchemaEditor] = useState<ItemSchemaEditorState>(() =>
    createPresetItemSchemaEditor(t),
  )
  const [levels, setLevels] = useState<LevelRangeDraft[]>([])
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' })
  const [liveProgress, setLiveProgress] = useState<ProductCreateProgressDto | null>(null)

  const previewUrl = useMemo(
    () => (image ? compressedImagePreviewUrl(image.base64, image.mimeType) : null),
    [image],
  )

  const itemSchema = useMemo(() => itemSchemaFromEditor(itemSchemaEditor), [itemSchemaEditor])
  const programId = useMemo(() => slugProgramId(name), [name])
  const estimatedCredits = useMemo(() => {
    const parsed = parseWordCountInput(wordCountText)
    if (parsed === null || parsed < App.get().itemMinCount()) {
      return null
    }
    return estimateAIVocabCredits(parsed)
  }, [wordCountText])

  async function handleImageSelected(file: File | null) {
    setImageError('')
    setImage(null)
    setImageFileName('')
    if (!file) {
      return
    }
    if (!isAcceptedImageFile(file)) {
      setImageError(t('createAiImage.validation.unsupportedType'))
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setImageError(t('createAiImage.validation.fileTooLarge', { max: formatByteSize(MAX_UPLOAD_BYTES) }))
      return
    }

    setCompressing(true)
    try {
      const compressed = await compressImageFile(file)
      setImage(compressed)
      setImageFileName(file.name)
    } catch {
      setImageError(t('createAiImage.validation.compressFailed'))
    } finally {
      setCompressing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleContinueSetup() {
    const trimmedName = name.trim()
    let valid = true
    if (!trimmedName) {
      setNameError(t('createProgram.validation.nameRequired'))
      valid = false
    } else {
      setNameError('')
    }
    if (!image) {
      setImageError(t('createAiImage.validation.imageRequired'))
      valid = false
    }
    const wordCountResult = validateWordCountInput(wordCountText, t)
    if (!wordCountResult.ok) {
      setWordCountError(wordCountResult.message)
      valid = false
    } else {
      setWordCountError('')
      setWordCount(wordCountResult.value)
    }
    if (!valid || compressing) {
      return
    }
    setStep('schema')
  }

  function handleContinueSchema() {
    const valid = itemSchemaEditor.fields.every((f) => f.label.trim())
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
    if (!image) {
      return
    }

    setStep('done')
    setSubmitState({ phase: 'submitting' })
    setLiveProgress(null)

    try {
      const created = await createProductRequest({
        type: 'image',
        title: name.trim() || undefined,
        imageBase64: image.base64,
        description: '',
        count: wordCount ?? App.get().itemMinCount(),
        nativeLangId: nativeLang,
        studyLangId: studyLang,
        config: programConfigWebFromEditor(itemSchemaEditor, levels),
      })

      await refreshAccount()

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
      await refreshAccount()
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
                {index + 1}. {t(`createAiImage.step.${s}` as TranslationKey)}
              </li>
            )
          })}
        </ol>
      )}

      {step === 'setup' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createAiImage.setup.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiImage.setup.hint')}</p>

          <label className="mt-6 block text-sm font-medium text-text" htmlFor="ai-image-program-name">
            {t('createProgram.stepName.label')}
          </label>
          <input
            id="ai-image-program-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('createProgram.stepName.placeholder')}
            className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
          />
          {nameError && <p className="mt-2 text-sm text-warning">{nameError}</p>}

          <div className="mt-5">
            <span className="block text-sm font-medium text-text">{t('createAiImage.setup.imageLabel')}</span>
            <p className="mt-1 text-xs text-text-muted">{t('createAiImage.setup.imageHint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={compressing}
              onChange={(e) => void handleImageSelected(e.target.files?.[0] ?? null)}
              className="mt-3 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent"
            />
            {compressing && (
              <p className="mt-2 text-sm text-text-muted">{t('createAiImage.setup.compressing')}</p>
            )}
            {imageError && <p className="mt-2 text-sm text-warning">{imageError}</p>}
            {image && previewUrl && (
              <div className="mt-4 space-y-3">
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-56 w-auto max-w-full rounded-xl border border-border object-contain"
                />
                <dl className="grid gap-1 text-xs text-text-muted sm:grid-cols-2">
                  <div>
                    <dt className="inline">{t('createAiImage.setup.fileName')}: </dt>
                    <dd className="inline text-text">{imageFileName}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t('createAiImage.setup.dimensions')}: </dt>
                    <dd className="inline tabular-nums text-text">
                      {image.width}×{image.height}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">{t('createAiImage.setup.originalSize')}: </dt>
                    <dd className="inline tabular-nums text-text">{formatByteSize(image.originalBytes)}</dd>
                  </div>
                  <div>
                    <dt className="inline">{t('createAiImage.setup.compressedSize')}: </dt>
                    <dd className="inline tabular-nums text-credit">{formatByteSize(image.compressedBytes)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-image-word-count">
            {t('createAiTitle.setup.wordCountLabel')}
          </label>
          <input
            id="ai-image-word-count"
            type="number"
            min={App.get().itemMinCount()}
            max={App.get().itemMaxCount()}
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
              min: App.get().itemMinCount(),
              max: App.get().itemMaxCount(),
            })}
          </p>
          {estimatedCredits != null && (
            <p className="mt-2 text-xs text-text-muted">
              {t('createAiTitle.setup.creditsEstimate', { credits: estimatedCredits })}
            </p>
          )}

          <div className={`${WIZARD_ACTIONS} sm:justify-end`}>
            <button
              type="button"
              onClick={handleContinueSetup}
              disabled={compressing}
              className={WIZARD_ACTION_PRIMARY}
            >
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </section>
      )}

      {step === 'schema' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createProgram.stepSchema.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiImage.schema.hint')}</p>
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

      {step === 'review' && image && previewUrl && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('createAiImage.review.title')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('createAiImage.review.hint')}</p>

          <img
            src={previewUrl}
            alt=""
            className="mt-4 max-h-40 w-auto max-w-full rounded-lg border border-border object-contain"
          />

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">{t('createProgram.stepName.label')}</dt>
              <dd className="font-medium text-text">{name.trim()}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiImage.setup.compressedSize')}</dt>
              <dd className="font-medium tabular-nums text-text">{formatByteSize(image.compressedBytes)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.setup.wordCountLabel')}</dt>
              <dd className="font-medium text-text">{wordCount ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiImage.review.jobType')}</dt>
              <dd className="font-mono text-xs text-text">vocab · fromImage</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createAiTitle.review.credits')}</dt>
              <dd className="font-medium tabular-nums text-credit">
                {wordCount != null
                  ? t('createAiTitle.review.creditsValue', { credits: estimateAIVocabCredits(wordCount) })
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
              {t('createAiImage.review.submit')}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {submitState.phase === 'submitting' || submitState.phase === 'processing'
              ? t('createAiImage.done.processingTitle')
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
                ? t('createAiImage.done.processingHint')
                : submitState.phase === 'success'
                  ? t('createAiImage.done.successHint')
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
