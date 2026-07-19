import { useMemo, useState } from 'react'
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
import { parseWordCountInput, validateWordCountInput } from '../../utils/aiVocabWordCount'
import { estimateAIVocabCredits } from '../../utils/pricing'
import { aiVocabErrorMessage } from './aiVocabError'

const PARAGRAPH_MIN_LENGTH = 20

export function CreateProgramFromParagraphPage() {
  const navigate = useNavigate()
  const { nativeLang, studyLang, t } = useLanguagePair()
  const studyLabel = findLanguage(studyLang)?.name ?? studyLang
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
  const [paragraph, setParagraph] = useState('')
  const [wordCountText, setWordCountText] = useState('')
  const [paragraphError, setParagraphError] = useState('')
  const [wordCountError, setWordCountError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const estimatedCredits = useMemo(() => {
    const parsed = parseWordCountInput(wordCountText)
    if (parsed === null || parsed < App.get().itemMinCount()) {
      return null
    }
    return estimateAIVocabCredits(parsed)
  }, [wordCountText])

  function validateForm(): number | null {
    let valid = true
    const trimmedParagraph = paragraph.trim()
    if (!trimmedParagraph) {
      setParagraphError(t('createAiParagraph.validation.paragraphRequired'))
      valid = false
    } else if (trimmedParagraph.length < PARAGRAPH_MIN_LENGTH) {
      setParagraphError(t('createAiParagraph.validation.paragraphMin', { min: PARAGRAPH_MIN_LENGTH }))
      valid = false
    } else {
      setParagraphError('')
    }
    const wordCountResult = validateWordCountInput(wordCountText, t)
    if (!wordCountResult.ok) {
      setWordCountError(wordCountResult.message)
      valid = false
    } else {
      setWordCountError('')
    }
    if (!valid || !ready || !programConfig) {
      return null
    }
    if (estimatedCredits !== null && estimatedCredits > creditBalance) {
      setErrorMessage(t('createAi.validation.insufficientCredits'))
      return null
    }
    setErrorMessage(null)
    return wordCountResult.ok ? wordCountResult.value : null
  }

  async function handleSubmit() {
    const count = validateForm()
    if (count === null || !programConfig) {
      return
    }

    setSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const created = await createProductRequest({
        type: 'paragraph',
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        paragraph: paragraph.trim(),
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
      title={t('createAiParagraph.setup.title')}
      hint={t('createAiParagraph.setup.hint')}
      langPair={studyLabel}
      successMessage={successMessage}
      errorMessage={errorMessage}
      t={t}
    >
      <label className="mt-6 block text-sm font-medium text-text" htmlFor="ai-paragraph">
        {t('createAiParagraph.setup.paragraphLabel')}
      </label>
      <textarea
        id="ai-paragraph"
        value={paragraph}
        onChange={(e) => {
          setParagraph(e.target.value)
          if (paragraphError) {
            setParagraphError('')
          }
        }}
        rows={6}
        placeholder={t('createAiParagraph.setup.paragraphPlaceholder')}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />
      {paragraphError && <p className="mt-2 text-sm text-warning">{paragraphError}</p>}

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-paragraph-title">
        {t('createAi.setup.titleOptionalLabel')}
      </label>
      <input
        id="ai-paragraph-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('createProgram.stepName.placeholder')}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />
      <p className="mt-1 text-xs text-text-muted">{t('createAi.setup.titleOptionalHint')}</p>

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-paragraph-description">
        {t('createAi.setup.descriptionLabel')}
      </label>
      <textarea
        id="ai-paragraph-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-paragraph-word-count">
        {t('createAiTitle.setup.wordCountLabel')}
      </label>
      <input
        id="ai-paragraph-word-count"
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
        submitLabel="createAiParagraph.review.submit"
        configIsCustom={configIsCustom}
        submitDisabled={!ready}
        submitting={submitting}
        t={t}
      />

      {programConfig && (
        <CustomConfigDialog
          open={configDialogOpen}
          programName={title.trim() || t('createAiParagraph.setup.title')}
          initialConfig={programConfig}
          onClose={() => setConfigDialogOpen(false)}
          onApply={setProgramConfig}
          t={t}
        />
      )}
    </AiCreatePageShell>
  )
}
