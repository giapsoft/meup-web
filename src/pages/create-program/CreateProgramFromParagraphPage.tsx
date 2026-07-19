import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createProductRequest } from '../../api/productCreate'
import {
  AiCreateFooter,
  AiCreateInsufficientCreditsAlert,
  AiCreateRefundNote,
} from '../../components/create/AiCreateFooter'
import { AiCreatePageShell } from '../../components/create/AiCreatePageShell'
import { CustomConfigDialog } from '../../components/create/CustomConfigDialog'
import { WordCountSlider, defaultWordCount } from '../../components/create/WordCountSlider'
import { useAccount } from '../../context/AccountProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { findLanguage } from '../../data/mock'
import { useAiCreateConfig } from '../../hooks/useAiCreateConfig'
import { App } from '../../app/App'
import { estimateAIVocabCredits } from '../../utils/pricing'
import { aiVocabErrorMessage, isInsufficientCreditsError } from './aiVocabError'

const PARAGRAPH_MIN_LENGTH = 20

export function CreateProgramFromParagraphPage() {
  const navigate = useNavigate()
  const { nativeLang, studyLang, t, uiLocale } = useLanguagePair()
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
  const [wordCount, setWordCount] = useState(defaultWordCount)
  const [paragraphError, setParagraphError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [missingCredits, setMissingCredits] = useState(0)

  const estimatedCredits = useMemo(() => estimateAIVocabCredits(wordCount), [wordCount])

  const creditsError = isInsufficientCreditsError(errorCode)

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
    if (!valid || !ready || !programConfig) {
      return null
    }
    if (estimatedCredits > creditBalance) {
      setErrorCode('insufficient_credits')
      setMissingCredits(estimatedCredits - creditBalance)
      setErrorMessage(null)
      return null
    }
    setErrorCode(null)
    setMissingCredits(0)
    setErrorMessage(null)
    return wordCount
  }

  async function handleSubmit() {
    const count = validateForm()
    if (count === null || !programConfig) {
      return
    }

    setSubmitting(true)
    setSuccessMessage(null)
    setErrorCode(null)
    setMissingCredits(0)
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
      setErrorCode(code)
      if (code === 'insufficient_credits' && estimatedCredits !== null) {
        setMissingCredits(Math.max(1, estimatedCredits - creditBalance))
        setErrorMessage(null)
      } else {
        setMissingCredits(0)
        setErrorMessage(aiVocabErrorMessage(code, t))
      }
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
      errorMessage={creditsError ? null : errorMessage}
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

      <WordCountSlider
        id="ai-paragraph-word-count"
        label={t('createAiTitle.setup.wordCountLabel')}
        value={wordCount}
        onChange={setWordCount}
        hint={t('createAiTitle.setup.wordCountHint', {
          min: App.get().itemMinCount(),
          max: App.get().itemMaxCount(),
        })}
        decreaseLabel={t('createAiTitle.setup.wordCountDecrease')}
        increaseLabel={t('createAiTitle.setup.wordCountIncrease')}
      />
      <p className="mt-2 text-xs text-text-muted">
        {t('createAiTitle.setup.creditsEstimate', {
          credits: new Intl.NumberFormat(uiLocale === 'vi' ? 'vi-VN' : 'en-US').format(
            estimatedCredits,
          ),
        })}
      </p>

      <AiCreateRefundNote t={t} />
      {creditsError ? (
        <AiCreateInsufficientCreditsAlert
          missingCredits={missingCredits}
          uiLocale={uiLocale}
          t={t}
        />
      ) : null}

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
