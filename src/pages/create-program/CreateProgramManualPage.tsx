import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelProductCreateManual } from '../../api/productCreateMedia'
import { AiCreateFooter } from '../../components/create/AiCreateFooter'
import { AiCreatePageShell } from '../../components/create/AiCreatePageShell'
import { CustomConfigDialog } from '../../components/create/CustomConfigDialog'
import { VocabEntryDialog } from '../../components/create/VocabEntryDialog'
import { useAccount } from '../../context/AccountProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useAiCreateConfig } from '../../hooks/useAiCreateConfig'
import { randomUUID } from '../../utils/id'
import { itemSchemaFromWebConfig } from '../../utils/programConfigWeb'

export function CreateProgramManualPage() {
  const navigate = useNavigate()
  const { nativeLang, studyLang, langPair, t } = useLanguagePair()
  const { refreshAccount } = useAccount()
  const {
    programConfig,
    setProgramConfig,
    configDialogOpen,
    setConfigDialogOpen,
    configIsCustom,
    ready,
  } = useAiCreateConfig()

  const [tempId] = useState(() => randomUUID())
  const submittedRef = useRef(false)
  const vocabOpenedRef = useRef(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [titleError, setTitleError] = useState('')
  const [vocabOpen, setVocabOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const schema = useMemo(
    () => (programConfig ? itemSchemaFromWebConfig(programConfig) : null),
    [programConfig],
  )

  useEffect(() => {
    return () => {
      if (!submittedRef.current && vocabOpenedRef.current) {
        void cancelProductCreateManual(tempId).catch(() => {})
      }
    }
  }, [tempId])

  function handleContinue() {
    if (!title.trim()) {
      setTitleError(t('createProgram.validation.nameRequired'))
      return
    }
    setTitleError('')
    setErrorMessage(null)
    vocabOpenedRef.current = true
    setVocabOpen(true)
  }

  async function handleVocabClose() {
    vocabOpenedRef.current = false
    setVocabOpen(false)
  }

  async function handleVocabSuccess(message: string) {
    submittedRef.current = true
    vocabOpenedRef.current = false
    setVocabOpen(false)
    await refreshAccount()
    setSuccessMessage(message)
  }

  return (
    <AiCreatePageShell
      title={t('createManual.setup.title')}
      hint={t('createManual.setup.hint')}
      langPair={langPair}
      successMessage={successMessage}
      errorMessage={errorMessage}
      t={t}
    >
      <label className="mt-6 block text-sm font-medium text-text" htmlFor="manual-title">
        {t('createManual.setup.titleLabel')}
      </label>
      <input
        id="manual-title"
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          if (titleError) {
            setTitleError('')
          }
        }}
        className="mt-1 w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        autoComplete="off"
      />
      {titleError && <p className="mt-1 text-sm text-warning">{titleError}</p>}

      <label className="mt-4 block text-sm font-medium text-text" htmlFor="manual-description">
        {t('createAi.setup.descriptionLabel')}
      </label>
      <textarea
        id="manual-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder={t('createAi.setup.descriptionPlaceholder')}
        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
      />

      <AiCreateFooter
        onConfig={() => setConfigDialogOpen(true)}
        onBack={() => navigate('/products/new')}
        onSubmit={handleContinue}
        submitLabel="createManual.footer.continue"
        configIsCustom={configIsCustom}
        submitDisabled={!ready}
        t={t}
      />

      {programConfig && schema && (
        <VocabEntryDialog
          open={vocabOpen}
          title={title}
          description={description}
          programConfig={programConfig}
          schema={schema}
          tempId={tempId}
          nativeLang={nativeLang}
          studyLang={studyLang}
          onClose={() => void handleVocabClose()}
          onSuccess={(message) => void handleVocabSuccess(message)}
          t={t}
        />
      )}

      {programConfig && (
        <CustomConfigDialog
          open={configDialogOpen}
          programName={title.trim() || t('createManual.setup.title')}
          initialConfig={programConfig}
          onClose={() => setConfigDialogOpen(false)}
          onApply={(config) => {
            setProgramConfig(config)
            setConfigDialogOpen(false)
          }}
          t={t}
        />
      )}
    </AiCreatePageShell>
  )
}
