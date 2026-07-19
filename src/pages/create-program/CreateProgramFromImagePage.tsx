import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createProductRequest } from '../../api/productCreate'
import { AiCreateFooter, AiCreateRefundNote } from '../../components/create/AiCreateFooter'
import { AiCreatePageShell } from '../../components/create/AiCreatePageShell'
import { CustomConfigDialog } from '../../components/create/CustomConfigDialog'
import { useAccount } from '../../context/AccountProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { findLanguage } from '../../data/mock'
import { useAiCreateConfig } from '../../hooks/useAiCreateConfig'
import { App } from '../../app/App'
import {
  compressImageFile,
  compressedImagePreviewUrl,
  formatByteSize,
  isAcceptedImageFile,
  type CompressedImage,
} from '../../utils/compressImageForApi'
import { parseWordCountInput, validateWordCountInput } from '../../utils/aiVocabWordCount'
import { estimateAIVocabCredits } from '../../utils/pricing'
import { aiVocabErrorMessage } from './aiVocabError'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export function CreateProgramFromImagePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { nativeLang, studyLang, t } = useLanguagePair()
  const studyLabel = findLanguage(studyLang)?.nativeName ?? studyLang
  const { creditBalance, refreshAccount } = useAccount()
  const {
    programConfig,
    setProgramConfig,
    configDialogOpen,
    setConfigDialogOpen,
    configIsCustom,
    ready,
  } = useAiCreateConfig()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<CompressedImage | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [compressing, setCompressing] = useState(false)
  const [wordCountText, setWordCountText] = useState('')
  const [imageError, setImageError] = useState('')
  const [wordCountError, setWordCountError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const previewUrl = useMemo(
    () => (image ? compressedImagePreviewUrl(image.base64, image.mimeType) : null),
    [image],
  )

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

  function validateForm(): number | null {
    if (!image) {
      setImageError(t('createAiImage.validation.imageRequired'))
      return null
    }
    setImageError('')
    const wordCountResult = validateWordCountInput(wordCountText, t)
    if (!wordCountResult.ok) {
      setWordCountError(wordCountResult.message)
      return null
    }
    setWordCountError('')
    if (!ready || !programConfig) {
      return null
    }
    if (estimatedCredits !== null && estimatedCredits > creditBalance) {
      setErrorMessage(t('createAi.validation.insufficientCredits'))
      return null
    }
    setErrorMessage(null)
    return wordCountResult.value
  }

  async function handleSubmit() {
    if (!image) {
      return
    }
    const count = validateForm()
    if (count === null || !programConfig) {
      return
    }

    setSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const created = await createProductRequest({
        type: 'image',
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        imageBase64: image.base64,
        count,
        nativeLangId: nativeLang,
        studyLangId: studyLang,
        config: programConfig,
      })
      await refreshAccount()
      setSuccessMessage(
        t('createAi.submitSuccess', { id: created.id, credits: created.totalCredits }),
      )
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed'
      setErrorMessage(aiVocabErrorMessage(code, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AiCreatePageShell
      title={t('createAiImage.setup.title')}
      hint={t('createAiImage.setup.hint')}
      langPair={studyLabel}
      successMessage={successMessage}
      errorMessage={errorMessage}
      t={t}
    >
      <label className="mt-6 block text-sm font-medium text-text" htmlFor="ai-image-file">
        {t('createAiImage.setup.imageLabel')}
      </label>
      <input
        ref={fileInputRef}
        id="ai-image-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => void handleImageSelected(e.target.files?.[0] ?? null)}
        className="mt-2 block w-full text-sm text-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent"
      />
      <p className="mt-1 text-xs text-text-muted">{t('createAiImage.setup.imageHint')}</p>
      {compressing && <p className="mt-2 text-sm text-text-muted">{t('createAiImage.setup.compressing')}</p>}
      {imageError && <p className="mt-2 text-sm text-warning">{imageError}</p>}

      {previewUrl && image && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-card">
          <img src={previewUrl} alt="" className="max-h-64 w-full object-contain" />
          <dl className="grid grid-cols-2 gap-2 px-3 py-2 text-xs text-text-muted">
            <div>
              <dt className="inline">{t('createAiImage.setup.fileName')}: </dt>
              <dd className="inline truncate text-text">{imageFileName}</dd>
            </div>
            <div>
              <dt className="inline">{t('createAiImage.setup.dimensions')}: </dt>
              <dd className="inline tabular-nums text-text">
                {image.width}×{image.height}
              </dd>
            </div>
            <div>
              <dt className="inline">{t('createAiImage.setup.compressedSize')}: </dt>
              <dd className="inline tabular-nums text-credit">{formatByteSize(image.compressedBytes)}</dd>
            </div>
          </dl>
        </div>
      )}

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-image-title">
        {t('createAi.setup.titleOptionalLabel')}
      </label>
      <input
        id="ai-image-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('createProgram.stepName.placeholder')}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />
      <p className="mt-1 text-xs text-text-muted">{t('createAi.setup.titleOptionalHint')}</p>

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-image-description">
        {t('createAi.setup.descriptionLabel')}
      </label>
      <textarea
        id="ai-image-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />

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
        className="mt-2 w-full max-w-[8rem] rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />
      {wordCountError && <p className="mt-2 text-sm text-warning">{wordCountError}</p>}
      {estimatedCredits != null && (
        <p className="mt-2 text-xs text-text-muted">
          {t('createAiTitle.setup.creditsEstimate', { credits: estimatedCredits })}
        </p>
      )}

      <AiCreateRefundNote t={t} />

      <AiCreateFooter
        onConfig={() => setConfigDialogOpen(true)}
        onBack={() => navigate('/products/new')}
        onSubmit={() => void handleSubmit()}
        submitLabel="createAiImage.review.submit"
        configIsCustom={configIsCustom}
        submitDisabled={!ready || compressing}
        submitting={submitting}
        t={t}
      />

      {programConfig && (
        <CustomConfigDialog
          open={configDialogOpen}
          programName={title.trim() || t('createAiImage.setup.title')}
          initialConfig={programConfig}
          onClose={() => setConfigDialogOpen(false)}
          onApply={setProgramConfig}
          t={t}
        />
      )}
    </AiCreatePageShell>
  )
}
