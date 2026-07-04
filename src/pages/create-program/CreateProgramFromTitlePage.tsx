import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { createProductRequest } from '../../api/productCreate'
import { AiCreateFooter, AiCreateRefundNote } from '../../components/create/AiCreateFooter'
import { AiCreatePageShell } from '../../components/create/AiCreatePageShell'
import { CustomConfigDialog } from '../../components/create/CustomConfigDialog'
import { useAccount } from '../../context/AccountProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useAiCreateConfig } from '../../hooks/useAiCreateConfig'
import { App } from '../../app/App'
import { parseWordCountInput, validateWordCountInput } from '../../utils/aiVocabWordCount'
import { estimateAIVocabCredits } from '../../utils/pricing'
import { aiVocabErrorMessage } from './aiVocabError'

export function CreateProgramFromTitlePage() {
  const navigate = useNavigate()
  const { nativeLang, studyLang, langPair, t } = useLanguagePair()
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
  const [wordCountText, setWordCountText] = useState('')
  const [titleError, setTitleError] = useState('')
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
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError(t('createAiTitle.validation.topicRequired'))
      valid = false
    } else {
      setTitleError('')
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
        type: 'title',
        title: title.trim(),
        description: description.trim() || undefined,
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
      title={t('createAiTitle.setup.title')}
      hint={t('createAiTitle.setup.hint')}
      langPair={langPair}
      successMessage={successMessage}
      errorMessage={errorMessage}
      t={t}
    >
      <label className="mt-6 block text-sm font-medium text-text" htmlFor="ai-title">
        {t('createAi.setup.titleLabel')}
      </label>
      <input
        id="ai-title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('createAiTitle.setup.topicPlaceholder')}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />
      {titleError && <p className="mt-2 text-sm text-warning">{titleError}</p>}

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-description">
        {t('createAi.setup.descriptionLabel')}
      </label>
      <textarea
        id="ai-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        placeholder={t('createAi.setup.descriptionPlaceholder')}
        className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
      />

      <label className="mt-5 block text-sm font-medium text-text" htmlFor="ai-word-count">
        {t('createAiTitle.setup.wordCountLabel')}
      </label>
      <input
        id="ai-word-count"
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

      <AiCreateRefundNote t={t} />

      <AiCreateFooter
        onConfig={() => setConfigDialogOpen(true)}
        onBack={() => navigate('/products/new')}
        onSubmit={() => void handleSubmit()}
        submitLabel="createAiTitle.review.submit"
        configIsCustom={configIsCustom}
        submitDisabled={!ready}
        submitting={submitting}
        t={t}
      />

      {programConfig && (
        <CustomConfigDialog
          open={configDialogOpen}
          programName={title.trim() || t('createAiTitle.setup.title')}
          initialConfig={programConfig}
          onClose={() => setConfigDialogOpen(false)}
          onApply={setProgramConfig}
          t={t}
        />
      )}
    </AiCreatePageShell>
  )
}
