import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { cancelProductCreateManual } from '../../api/productCreateMedia'
import { getAccount } from '../../api/emailAuth'
import {
  exportProductVersion,
  getProductDraft,
  getProductImportPackage,
  listOwnedProducts,
  saveProductDraft,
  type OwnedProductDto,
} from '../../api/product'
import { AiCreateFooter } from '../../components/create/AiCreateFooter'
import { CustomConfigDialog } from '../../components/create/CustomConfigDialog'
import { VocabEntryTable } from '../../components/create/VocabEntryTable'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { App } from '../../app/App'
import type { VocabItemDraft } from '../../types/program'
import type { ProgramConfigWeb } from '../../types/webConfig'
import { editorStateFromWebConfig } from '../../utils/customConfigState'
import { toExportVersionTree } from '../../utils/exportVersionTree'
import { importTreeToEditDraft } from '../../utils/importPackageToEditDraft'
import { randomUUID } from '../../utils/id'
import { itemSchemaFromWebConfig } from '../../utils/programConfigWeb'
import { programConfigsEqual } from '../../utils/programConfigCompare'
import {
  createDefaultEditDraft,
  draftToVocabItems,
  parseProductEditDraft,
  serializeProductEditDraft,
  vocabItemsToDraftRows,
  type ProductEditDraft,
} from '../../utils/productEditDraft'
import { createEmptyVocabItem, validateVocabItems } from '../../utils/vocabItems'
import {
  WIZARD_MAIN,
  WIZARD_NARROW_SECTION,
} from '../create-program/wizardLayout'

type LoadState = 'loading' | 'ready' | 'notFound' | 'error'

type PublishState =
  | { phase: 'idle' }
  | { phase: 'publishing' }
  | { phase: 'success'; versionId: number }
  | { phase: 'failed'; message: string }

type SaveDraftState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved' }
  | { phase: 'failed' }

type EditLocationState = {
  product?: OwnedProductDto
}

export function EditProgramPage() {
  const { productId } = useParams<{ productId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, langPair, nativeLang, studyLang } = useLanguagePair()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [productMeta, setProductMeta] = useState<OwnedProductDto | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [programConfig, setProgramConfig] = useState<ProgramConfigWeb | null>(null)
  const [defaultConfig, setDefaultConfig] = useState<ProgramConfigWeb | null>(null)
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>([])
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [publishState, setPublishState] = useState<PublishState>({ phase: 'idle' })
  const [saveDraftState, setSaveDraftState] = useState<SaveDraftState>({ phase: 'idle' })
  const [tempId] = useState(() => randomUUID())
  const stagingUsedRef = useRef(false)

  const schema = useMemo(
    () => (programConfig ? itemSchemaFromWebConfig(programConfig) : null),
    [programConfig],
  )

  const configIsCustom =
    programConfig !== null && defaultConfig !== null
      ? !programConfigsEqual(programConfig, defaultConfig)
      : false

  const draftPayload = useMemo(() => {
    if (!programConfig) {
      return ''
    }
    const draft: ProductEditDraft = {
      version: 2,
      title,
      description: description.trim() || undefined,
      programConfig,
      vocabItems: vocabItemsToDraftRows(vocabItems),
    }
    return serializeProductEditDraft(draft)
  }, [title, description, programConfig, vocabItems])

  const persistDraft = useCallback(async () => {
    if (!productId || !draftPayload) {
      return
    }
    setSaveDraftState({ phase: 'saving' })
    try {
      await saveProductDraft(productId, draftPayload)
      setSaveDraftState({ phase: 'saved' })
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
        const webConfig = await App.get().config()
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
        const defaultSnapshot = structuredClone(webConfig.defaultConfig)

        if (!cancelled) {
          setProductMeta(meta)
          setDefaultConfig(defaultSnapshot)

          if (parsed.ok) {
            setTitle(parsed.draft.title || meta.name)
            setDescription(parsed.draft.description ?? meta.description ?? '')
            setProgramConfig(structuredClone(parsed.draft.programConfig))
            setVocabItems(draftToVocabItems(parsed.draft))
          } else {
            let loaded = false
            try {
              const imported = await getProductImportPackage(productId!)
              const fromPackage = importTreeToEditDraft(
                imported.tree,
                meta.name,
                meta.description ?? '',
              )
              setTitle(fromPackage.title)
              setDescription(fromPackage.description ?? '')
              setProgramConfig(structuredClone(fromPackage.programConfig))
              setVocabItems(draftToVocabItems(fromPackage))
              loaded = true
            } catch (err) {
              if (err instanceof ApiError && err.code === 'no_published_package') {
                // fall through to preset
              } else if (!(err instanceof ApiError)) {
                throw err
              }
            }
            if (!loaded) {
              const defaults = createDefaultEditDraft(meta.name, meta.description ?? '', t)
              setTitle(defaults.title)
              setDescription(defaults.description ?? '')
              setProgramConfig(structuredClone(defaults.programConfig))
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
    return () => {
      if (stagingUsedRef.current) {
        void cancelProductCreateManual(tempId).catch(() => {})
      }
    }
  }, [tempId])

  useEffect(() => {
    stagingUsedRef.current = vocabItems.some((item) =>
      Object.values(item.serverMedia ?? {}).some(Boolean),
    )
  }, [vocabItems])

  if (!productId) {
    return <Navigate to="/products" replace />
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
    if (!programConfig || !schema) {
      return
    }
    const levels = editorStateFromWebConfig(programConfig).levels
    const result = validateVocabItems(vocabItems, levels, schema)
    if (!result.ok) {
      if (result.reason === 'empty') {
        window.alert(t('createProgram.validation.vocabEmpty'))
      } else {
        window.alert(t('createProgram.validation.vocabRequiredFields'))
      }
      return
    }

    setPublishState({ phase: 'publishing' })

    try {
      const tree = toExportVersionTree(
        nativeLang,
        studyLang,
        title.trim() || productMeta?.name || 'Course',
        schema,
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

  if (publishState.phase === 'success' || publishState.phase === 'failed' || publishState.phase === 'publishing') {
    return (
      <main className={WIZARD_MAIN}>
        <section className={WIZARD_NARROW_SECTION}>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {publishState.phase === 'publishing'
              ? t('editProgram.done.publishing')
              : publishState.phase === 'success'
                ? t('editProgram.done.successTitle')
                : t('editProgram.done.failedTitle')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {publishState.phase === 'publishing'
              ? t('editProgram.done.publishingHint')
              : publishState.phase === 'success'
                ? t('editProgram.done.successHint')
                : publishState.message}
          </p>
          {publishState.phase === 'success' && (
            <p className="mt-2 font-mono text-xs text-text-muted">
              {t('editProgram.done.versionId', { id: publishState.versionId })}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPublishState({ phase: 'idle' })}
              className="rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text"
            >
              {t('editProgram.done.continueEdit')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="rounded-xl border border-accent/40 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent"
            >
              {t('editProgram.backProducts')}
            </button>
          </div>
        </section>
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
        {t('editProgram.subtitle', { name: title || productMeta?.name || '', pair: langPair })}
      </p>

      <section className={`${WIZARD_NARROW_SECTION} mt-4`}>
        <h1 className="text-xl font-semibold text-text sm:text-2xl">{t('editProgram.title')}</h1>
        <p className="mt-2 text-sm text-text-muted">{t('editProgram.hint')}</p>

        <label className="mt-6 block text-sm font-medium text-text" htmlFor="edit-title">
          {t('editProgram.titleLabel')}
        </label>
        <input
          id="edit-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />

        <label className="mt-4 block text-sm font-medium text-text" htmlFor="edit-description">
          {t('createAi.setup.descriptionLabel')}
        </label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t('createAi.setup.descriptionPlaceholder')}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
        />

        {schema && programConfig && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text">{t('editProgram.vocabTitle')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('editProgram.vocabHint')}</p>
            <VocabEntryTable
              programName={title}
              schema={schema}
              items={vocabItems}
              onItemsChange={setVocabItems}
              tempId={tempId}
              nativeLang={nativeLang}
              studyLang={studyLang}
              t={t}
            />
          </div>
        )}

        <AiCreateFooter
          onConfig={() => setConfigDialogOpen(true)}
          onBack={() => navigate('/products')}
          onSubmit={() => void handlePublish()}
          submitLabel="editProgram.publish"
          configIsCustom={configIsCustom}
          submitDisabled={!programConfig}
          t={t}
        />
      </section>

      {programConfig && (
        <CustomConfigDialog
          open={configDialogOpen}
          programName={title.trim() || productMeta?.name || t('editProgram.title')}
          initialConfig={programConfig}
          lockSchema
          onClose={() => setConfigDialogOpen(false)}
          onApply={(config) => {
            setProgramConfig(config)
            setConfigDialogOpen(false)
          }}
          t={t}
        />
      )}
    </main>
  )
}
