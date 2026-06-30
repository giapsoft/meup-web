import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getAccount } from '../../api/emailAuth'
import { createProductRequest, pollProductCreateProgress } from '../../api/productCreate'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import type { TranslationKey } from '../../i18n/types'
import type { ItemSchemaEditorState, LevelRangeDraft, SchemaFieldUiType, SideDraft, VocabItemDraft } from '../../types/program'
import { toProductCreatePayloadString } from '../../utils/compactProgramConfig'
import { buildDefaultLevels } from '../../utils/defaultSides'
import { schemaHasLangRole } from '../../utils/itemSchemaLayout'
import {
  createEmptyVocabItem,
  primaryTextAttributeKey,
  validateVocabItems,
} from '../../utils/vocabItems'
import {
  createPresetItemSchemaEditor,
  itemSchemaFromEditor,
  slugProgramId,
} from '../../utils/schemaField'
import { CardSetupStep } from './CardSetupStep'
import { DisplayElementEditorStep } from './DisplayElementEditorStep'
import { ItemSchemaEditor } from './ItemSchemaEditor'
import { SideEditorStep } from './SideEditorStep'
import { VocabEntryStep } from './VocabEntryStep'
import { WizardProgress, wizardPhaseFromStep } from './WizardProgress'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_MAIN,
  WIZARD_NARROW_SECTION,
} from './wizardLayout'

type WizardStep = 'name' | 'schema' | 'cardSetup' | 'sideEdit' | 'displayEdit' | 'vocabEntry' | 'done'

type SubmitState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'success'; requestId: string }
  | { phase: 'failed'; message: string }

const FIELD_TYPE_KEYS: Record<SchemaFieldUiType, TranslationKey> = {
  text: 'createProgram.fieldType.text',
  'text+audio': 'createProgram.fieldType.textAudio',
}

function findSide(levels: LevelRangeDraft[], sideId: string): SideDraft | undefined {
  for (const level of levels) {
    const side = level.sides.find((s) => s.id === sideId)
    if (side) {
      return side
    }
  }
  return undefined
}

export function CreateProgramWizard() {
  const { t, langPair, nativeLang, studyLang } = useLanguagePair()
  const isWideLayout = useWizardWideLayout()
  const [step, setStep] = useState<WizardStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [itemSchemaEditor, setItemSchemaEditor] = useState<ItemSchemaEditorState>(() =>
    createPresetItemSchemaEditor(t),
  )
  const [levels, setLevels] = useState<LevelRangeDraft[]>([])
  const [activeLevelId, setActiveLevelId] = useState('')
  const [editingSideId, setEditingSideId] = useState<string | null>(null)
  const [editingDisplayIndex, setEditingDisplayIndex] = useState<number | null>(null)
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>([])
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: 'idle' })

  const programId = useMemo(() => slugProgramId(name), [name])
  const itemSchema = useMemo(() => itemSchemaFromEditor(itemSchemaEditor), [itemSchemaEditor])
  const editingSide = useMemo(
    () => (editingSideId ? findSide(levels, editingSideId) : undefined),
    [levels, editingSideId],
  )

  const exportPayload = useMemo(
    () => toProductCreatePayloadString(itemSchema, levels, vocabItems),
    [itemSchema, levels, vocabItems],
  )

  const totalSides = levels.reduce((n, l) => n + l.sides.length, 0)

  useEffect(() => {
    if (isWideLayout && step === 'displayEdit') {
      setStep('sideEdit')
    }
  }, [isWideLayout, step])

  function openDisplayEditor(index: number) {
    setEditingDisplayIndex(index)
    if (!isWideLayout) {
      setStep('displayEdit')
    }
  }

  function closeDisplayEditor() {
    setEditingDisplayIndex(null)
    if (step === 'displayEdit') {
      setStep('sideEdit')
    }
  }

  function handleStart() {
    if (!name.trim()) {
      setNameError(t('createProgram.validation.nameRequired'))
      return
    }
    setNameError('')
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
    const defaultLevels = buildDefaultLevels(itemSchema)
    setLevels(defaultLevels)
    setActiveLevelId(defaultLevels[0].id)
    setStep('cardSetup')
  }

  function handleContinueCardSetup() {
    const hasSides = levels.every((l) => l.sides.length > 0)
    if (!hasSides) {
      window.alert(t('createProgram.validation.sidesRequired'))
      return
    }
    if (vocabItems.length === 0) {
      setVocabItems([createEmptyVocabItem(itemSchema)])
    }
    setStep('vocabEntry')
  }

  async function handleContinueVocab() {
    const result = validateVocabItems(vocabItems, levels, itemSchema)
    if (!result.ok) {
      if (result.reason === 'empty') {
        window.alert(t('createProgram.validation.vocabEmpty'))
      } else {
        window.alert(t('createProgram.validation.vocabRequiredFields'))
      }
      return
    }

    setSubmitState({ phase: 'submitting' })
    setStep('done')

    try {
      const account = await getAccount()
      const created = await createProductRequest({
        ownerId: account.userId,
        productName: name.trim(),
        productDescription: '',
        nativeLangId: nativeLang,
        studyLangId: studyLang,
        payload: exportPayload,
        jobs: [],
      })
      const progress = await pollProductCreateProgress(created.id)
      if (progress.status === 'success') {
        setSubmitState({ phase: 'success', requestId: created.id })
      } else {
        setSubmitState({
          phase: 'failed',
          message: progress.status,
        })
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.code : 'request_failed'
      setSubmitState({ phase: 'failed', message })
    }
  }

  function updateSide(sideId: string, nextSide: SideDraft) {
    setLevels((prev) =>
      prev.map((level) => ({
        ...level,
        sides: level.sides.map((s) => (s.id === sideId ? nextSide : s)),
      })),
    )
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
      {step !== 'name' && (
        <WizardProgress current={wizardPhaseFromStep(step)} t={t} />
      )}

      {step === 'name' && (
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {t('createProgram.stepName.title')}
          </h1>
          <label className="mt-6 block text-sm font-medium text-text" htmlFor="program-name">
            {t('createProgram.stepName.label')}
          </label>
          <input
            id="program-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('createProgram.stepName.placeholder')}
            className="mt-2 w-full rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:text-base"
          />
          {nameError && <p className="mt-2 text-sm text-warning">{nameError}</p>}
          <button
            type="button"
            onClick={handleStart}
            className={`mt-6 w-full sm:w-auto lg:max-w-xs ${WIZARD_ACTION_PRIMARY}`}
          >
            {t('createProgram.stepName.start')}
          </button>
        </section>
      )}

      {step === 'schema' && (
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {t('createProgram.stepSchema.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{t('createProgram.stepSchema.hint')}</p>
          <p className="mt-1 text-xs text-text-muted">{name}</p>

          <ItemSchemaEditor
            value={itemSchemaEditor}
            onChange={setItemSchemaEditor}
            fieldTypeKeys={FIELD_TYPE_KEYS}
            t={t}
          />

          <div className={`${WIZARD_ACTIONS} mt-6 sm:justify-between`}>
            <button
              type="button"
              onClick={() => setStep('name')}
              className={WIZARD_ACTION_SECONDARY}
            >
              {t('createProgram.stepSchema.back')}
            </button>
            <button
              type="button"
              onClick={handleContinueSchema}
              className={WIZARD_ACTION_PRIMARY}
            >
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </section>
      )}

      {step === 'cardSetup' && (
        <CardSetupStep
          programName={name}
          schema={itemSchema}
          levels={levels}
          activeLevelId={activeLevelId}
          onLevelsChange={setLevels}
          onActiveLevelChange={setActiveLevelId}
          onEditSide={(sideId) => {
            setEditingSideId(sideId)
            setStep('sideEdit')
          }}
          onBack={() => setStep('schema')}
          onContinue={handleContinueCardSetup}
          t={t}
        />
      )}

      {step === 'sideEdit' && editingSide && (
        <SideEditorStep
          programName={name}
          side={editingSide}
          schema={itemSchema}
          editingDisplayIndex={isWideLayout ? editingDisplayIndex : null}
          onChange={(next) => updateSide(editingSide.id, next)}
          onEditDisplay={openDisplayEditor}
          onCloseDisplayEdit={closeDisplayEditor}
          onBack={() => {
            setEditingSideId(null)
            setEditingDisplayIndex(null)
            setStep('cardSetup')
          }}
          t={t}
        />
      )}

      {step === 'displayEdit' &&
        !isWideLayout &&
        editingSide &&
        editingDisplayIndex !== null &&
        editingSide.display[editingDisplayIndex] && (
          <DisplayElementEditorStep
            side={editingSide}
            displayIndex={editingDisplayIndex}
            schema={itemSchema}
            onChange={(next) => updateSide(editingSide.id, next)}
            onSelectDisplayIndex={openDisplayEditor}
            onBack={closeDisplayEditor}
            t={t}
          />
        )}

      {step === 'vocabEntry' && (
        <VocabEntryStep
          programName={name}
          schema={itemSchema}
          levels={levels}
          items={vocabItems}
          onItemsChange={setVocabItems}
          onBack={() => setStep('cardSetup')}
          onContinue={handleContinueVocab}
          t={t}
        />
      )}

      {step === 'done' && (
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {submitState.phase === 'submitting'
              ? t('createProgram.stepDone.submitting')
              : submitState.phase === 'success'
                ? t('createProgram.stepDone.title')
                : submitState.phase === 'failed'
                  ? t('createProgram.stepDone.failedTitle')
                  : t('createProgram.stepDone.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {submitState.phase === 'submitting'
              ? t('createProgram.stepDone.submittingHint')
              : submitState.phase === 'success'
                ? t('createProgram.stepDone.subtitle')
                : submitState.phase === 'failed'
                  ? submitState.message
                  : t('createProgram.stepDone.subtitle')}
          </p>

          {submitState.phase === 'success' && (
            <p className="mt-2 font-mono text-xs text-text-muted">
              {t('createProgram.stepDone.requestId', { id: submitState.requestId })}
            </p>
          )}

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">{t('createProgram.stepName.label')}</dt>
              <dd className="font-medium text-text">{name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">ID</dt>
              <dd className="font-mono text-text">{programId}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createProgram.stepDone.schemaTitle')}</dt>
              <dd className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs">
                  <span className="font-mono text-text">hasImage</span>
                  <span className="shrink-0 text-text-muted">{itemSchema.hasImage ? '1' : '0'}</span>
                </div>
                {itemSchema.attrs.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs font-mono"
                  >
                    <span className="min-w-0 truncate text-text">{attr.key}</span>
                    <span className="shrink-0 text-text-muted">
                      {attr.type === 'text+audio' ? '1' : '0'}
                      {attr.langType === 'native' ? ',1' : attr.langType === 'study' ? ',2' : ',0'}
                    </span>
                  </div>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createProgram.stepDone.vocabTitle')}</dt>
              <dd className="font-medium text-text">
                {t('createProgram.stepDone.vocabSummary', { count: vocabItems.length })}
              </dd>
              {vocabItems.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-text-muted">
                  {vocabItems.slice(0, 8).map((item, index) => {
                    const key = primaryTextAttributeKey(itemSchema)
                    const label = key ? item.values[key]?.trim() : ''
                    return (
                      <li key={item.id} className="truncate rounded-lg bg-surface-card px-2 py-1">
                        {label || t('createProgram.stepDone.vocabRowEmpty', { n: index + 1 })}
                      </li>
                    )
                  })}
                  {vocabItems.length > 8 && (
                    <li className="px-2 py-1 italic">
                      {t('createProgram.stepDone.vocabMore', { count: vocabItems.length - 8 })}
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div>
              <dt className="text-text-muted">{t('createProgram.stepDone.levelsTitle')}</dt>
              <dd className="font-medium text-text">
                {t('createProgram.stepDone.levelsSummary', {
                  levels: levels.length,
                  sides: totalSides,
                })}
              </dd>
            </div>
          </dl>

          <Link
            to="/"
            className={`mt-6 lg:max-w-xs ${WIZARD_ACTION_SECONDARY} inline-flex items-center justify-center no-underline`}
          >
            {t('createProgram.stepDone.backHome')}
          </Link>
        </section>
      )}
    </main>
  )
}
