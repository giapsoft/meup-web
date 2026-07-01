import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { getAccount } from '../../api/emailAuth'
import {
  exportProductVersion,
  getProductDraft,
  getProductImportPackage,
  listOwnedProducts,
  saveProductDraft,
  type OwnedProductDto,
} from '../../api/product'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import type { TranslationKey } from '../../i18n/types'
import type {
  ItemSchemaEditorState,
  LevelRangeDraft,
  SchemaFieldUiType,
  SideDraft,
  VocabItemDraft,
} from '../../types/program'
import { toExportVersionTree } from '../../utils/exportVersionTree'
import { buildDefaultLevels } from '../../utils/defaultSides'
import { schemaHasLangRole } from '../../utils/itemSchemaLayout'
import {
  createDefaultEditDraft,
  draftToVocabItems,
  parseProductEditDraft,
  serializeProductEditDraft,
} from '../../utils/productEditDraft'
import { importTreeToEditDraft } from '../../utils/importPackageToEditDraft'
import {
  createEmptyVocabItem,
  validateVocabItems,
} from '../../utils/vocabItems'
import { createPresetItemSchemaEditor, itemSchemaFromEditor } from '../../utils/schemaField'
import { CardSetupStep } from '../create-program/CardSetupStep'
import { DisplayElementEditorStep } from '../create-program/DisplayElementEditorStep'
import { ItemSchemaEditor } from '../create-program/ItemSchemaEditor'
import { SideEditorStep } from '../create-program/SideEditorStep'
import { VocabEntryStep } from '../create-program/VocabEntryStep'
import { WizardProgress, wizardPhaseFromStep } from '../create-program/WizardProgress'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
  WIZARD_MAIN,
  WIZARD_NARROW_SECTION,
} from '../create-program/wizardLayout'

type WizardStep = 'schema' | 'cardSetup' | 'sideEdit' | 'displayEdit' | 'vocabEntry' | 'done'

type LoadState = 'loading' | 'ready' | 'notFound' | 'error'

type PublishState =
  | { phase: 'idle' }
  | { phase: 'publishing' }
  | { phase: 'success'; versionId: number }
  | { phase: 'failed'; message: string }

type SaveDraftState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved'; at: string }
  | { phase: 'failed' }

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

type EditLocationState = {
  product?: OwnedProductDto
}

export function EditProgramPage() {
  const { productId } = useParams<{ productId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, langPair, nativeLang, studyLang } = useLanguagePair()
  const isWideLayout = useWizardWideLayout()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [productMeta, setProductMeta] = useState<OwnedProductDto | null>(null)
  const [step, setStep] = useState<WizardStep>('schema')
  const [name, setName] = useState('')
  const [itemSchemaEditor, setItemSchemaEditor] = useState<ItemSchemaEditorState>(() =>
    createPresetItemSchemaEditor(t),
  )
  const [levels, setLevels] = useState<LevelRangeDraft[]>([])
  const [activeLevelId, setActiveLevelId] = useState('')
  const [editingSideId, setEditingSideId] = useState<string | null>(null)
  const [editingDisplayIndex, setEditingDisplayIndex] = useState<number | null>(null)
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>([])
  const [publishState, setPublishState] = useState<PublishState>({ phase: 'idle' })
  const [saveDraftState, setSaveDraftState] = useState<SaveDraftState>({ phase: 'idle' })

  const itemSchema = useMemo(() => itemSchemaFromEditor(itemSchemaEditor), [itemSchemaEditor])
  const editingSide = useMemo(
    () => (editingSideId ? findSide(levels, editingSideId) : undefined),
    [levels, editingSideId],
  )
  const totalSides = levels.reduce((n, l) => n + l.sides.length, 0)

  const draftPayload = useMemo(
    () =>
      serializeProductEditDraft({
        version: 1,
        name,
        itemSchemaEditor,
        levels,
        vocabItems: vocabItems.map((item) => ({
          id: item.id,
          values: { ...item.values },
        })),
      }),
    [name, itemSchemaEditor, levels, vocabItems],
  )

  const persistDraft = useCallback(async () => {
    if (!productId) {
      return
    }
    setSaveDraftState({ phase: 'saving' })
    try {
      await saveProductDraft(productId, draftPayload)
      setSaveDraftState({ phase: 'saved', at: new Date().toISOString() })
    } catch (err) {
      const message = err instanceof ApiError ? err.code : 'request_failed'
      setSaveDraftState({ phase: 'failed' })
      throw new Error(message)
    }
  }, [productId, draftPayload])

  useEffect(() => {
    if (!productId) {
      return
    }
    let cancelled = false

    async function load() {
      setLoadState('loading')
      try {
        const state = location.state as EditLocationState | null
        let meta = state?.product ?? null
        if (!meta || meta.productId !== productId) {
          const account = await getAccount()
          const owned = await listOwnedProducts(account.userId, { nativeLang, studyLang })
          meta = owned.products.find((p) => p.productId === productId) ?? null
        }
        if (!meta) {
          if (!cancelled) {
            setLoadState('notFound')
          }
          return
        }

        const draftRes = await getProductDraft(productId!)
        const parsed = parseProductEditDraft(draftRes.draftData)

        if (!cancelled) {
          setProductMeta(meta)
          if (parsed.ok) {
            setName(parsed.draft.name || meta.name)
            setItemSchemaEditor(parsed.draft.itemSchemaEditor)
            setLevels(parsed.draft.levels)
            setActiveLevelId(parsed.draft.levels[0]?.id ?? '')
            setVocabItems(draftToVocabItems(parsed.draft))
          } else {
            let loadedFromPackage = false
            try {
              const imported = await getProductImportPackage(productId!)
              const fromPackage = importTreeToEditDraft(imported.tree, meta.name)
              setName(fromPackage.name)
              setItemSchemaEditor(fromPackage.itemSchemaEditor)
              setLevels(fromPackage.levels)
              setActiveLevelId(fromPackage.levels[0]?.id ?? '')
              setVocabItems(draftToVocabItems(fromPackage))
              loadedFromPackage = true
            } catch (err) {
              if (err instanceof ApiError && err.code === 'no_published_package') {
                // Never exported — fall back to preset wizard state.
              } else if (!(err instanceof ApiError)) {
                throw err
              }
            }
            if (!loadedFromPackage) {
              const defaults = createDefaultEditDraft(meta.name, t)
              setName(defaults.name)
              setItemSchemaEditor(defaults.itemSchemaEditor)
              setLevels(defaults.levels)
              setActiveLevelId(defaults.levels[0]?.id ?? '')
              setVocabItems(draftToVocabItems(defaults))
            }
          }
          setLoadState('ready')
        }
      } catch {
        if (!cancelled) {
          setLoadState('error')
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [productId, location.state, nativeLang, studyLang, t])

  useEffect(() => {
    if (isWideLayout && step === 'displayEdit') {
      setStep('sideEdit')
    }
  }, [isWideLayout, step])

  if (!productId) {
    return <Navigate to="/products" replace />
  }

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
    if (levels.length === 0) {
      const defaultLevels = buildDefaultLevels(itemSchema)
      setLevels(defaultLevels)
      setActiveLevelId(defaultLevels[0].id)
    }
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

  async function handleSaveDraftClick() {
    try {
      await persistDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'request_failed'
      window.alert(t('editProgram.error.generic', { code: message }))
    }
  }

  async function handlePublish() {
    const result = validateVocabItems(vocabItems, levels, itemSchema)
    if (!result.ok) {
      if (result.reason === 'empty') {
        window.alert(t('createProgram.validation.vocabEmpty'))
      } else {
        window.alert(t('createProgram.validation.vocabRequiredFields'))
      }
      return
    }

    setPublishState({ phase: 'publishing' })
    setStep('done')

    try {
      const tree = toExportVersionTree(
        nativeLang,
        studyLang,
        name.trim() || productMeta?.name || 'Course',
        itemSchema,
        levels,
        vocabItems,
      )
      const exported = await exportProductVersion({ productId: productId!, tree })
      setPublishState({ phase: 'success', versionId: exported.versionId })
    } catch (err) {
      const message = err instanceof ApiError ? err.code : 'request_failed'
      setPublishState({ phase: 'failed', message })
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

  if (loadState === 'loading') {
    return (
      <main className={WIZARD_MAIN}>
        <p className="text-sm text-text-muted">{t('editProgram.loading')}</p>
      </main>
    )
  }

  if (loadState === 'notFound') {
    return (
      <main className={WIZARD_MAIN}>
        <p className="text-sm text-text-muted">{t('editProgram.notFound')}</p>
        <Link to="/products" className="mt-4 inline-flex text-sm text-accent no-underline">
          {t('editProgram.backProducts')}
        </Link>
      </main>
    )
  }

  if (loadState === 'error') {
    return (
      <main className={WIZARD_MAIN}>
        <p className="text-sm text-warning">{t('editProgram.error.load')}</p>
        <Link to="/products" className="mt-4 inline-flex text-sm text-accent no-underline">
          {t('editProgram.backProducts')}
        </Link>
      </main>
    )
  }

  return (
    <main className={WIZARD_MAIN}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/products"
          className="inline-flex text-sm text-text-muted no-underline transition hover:text-accent"
        >
          {t('editProgram.backProducts')}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {saveDraftState.phase === 'saving' && <span>{t('editProgram.draft.saving')}</span>}
          {saveDraftState.phase === 'saved' && <span>{t('editProgram.draft.saved')}</span>}
          {saveDraftState.phase === 'failed' && (
            <span className="text-warning">{t('editProgram.draft.failed')}</span>
          )}
          <button
            type="button"
            onClick={() => void handleSaveDraftClick()}
            disabled={saveDraftState.phase === 'saving'}
            className="rounded-lg border border-border bg-surface-card px-3 py-1.5 text-xs font-medium text-text transition hover:border-accent/40 disabled:opacity-60"
          >
            {t('editProgram.draft.save')}
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-text-muted lg:text-sm">
        {t('editProgram.subtitle', { name: productMeta?.name ?? name, pair: langPair })}
      </p>

      {step !== 'done' && <WizardProgress current={wizardPhaseFromStep(step)} t={t} />}

      {step === 'schema' && (
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {t('editProgram.stepSchema.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{t('createProgram.stepSchema.hint')}</p>
          <p className="mt-1 text-xs text-text-muted">{name}</p>

          <ItemSchemaEditor
            value={itemSchemaEditor}
            onChange={setItemSchemaEditor}
            fieldTypeKeys={FIELD_TYPE_KEYS}
            t={t}
          />

          <div className={`${WIZARD_ACTIONS} mt-6 sm:justify-end`}>
            <button type="button" onClick={handleContinueSchema} className={WIZARD_ACTION_PRIMARY}>
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
          onContinue={() => void handlePublish()}
          continueLabelKey="editProgram.publish"
          t={t}
        />
      )}

      {step === 'done' && (
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {publishState.phase === 'publishing'
              ? t('editProgram.done.publishing')
              : publishState.phase === 'success'
                ? t('editProgram.done.successTitle')
                : publishState.phase === 'failed'
                  ? t('editProgram.done.failedTitle')
                  : t('editProgram.done.successTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {publishState.phase === 'publishing'
              ? t('editProgram.done.publishingHint')
              : publishState.phase === 'success'
                ? t('editProgram.done.successHint')
                : publishState.phase === 'failed'
                  ? publishState.message
                  : t('editProgram.done.successHint')}
          </p>

          {publishState.phase === 'success' && (
            <p className="mt-2 font-mono text-xs text-text-muted">
              {t('editProgram.done.versionId', { id: publishState.versionId })}
            </p>
          )}

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-text-muted">{t('createProgram.stepName.label')}</dt>
              <dd className="font-medium text-text">{name}</dd>
            </div>
            <div>
              <dt className="text-text-muted">{t('createProgram.stepDone.vocabTitle')}</dt>
              <dd className="font-medium text-text">
                {t('createProgram.stepDone.vocabSummary', { count: vocabItems.length })}
              </dd>
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

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setPublishState({ phase: 'idle' })
                setStep('vocabEntry')
              }}
              className={WIZARD_ACTION_SECONDARY}
            >
              {t('editProgram.done.continueEdit')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className={WIZARD_ACTION_PRIMARY}
            >
              {t('editProgram.backProducts')}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
