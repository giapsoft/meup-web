import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import type { TranslationKey } from '../../i18n/types'
import type { LevelRangeDraft, SchemaFieldRow, SchemaFieldUiType, SideDraft, VocabItemDraft } from '../../types/program'
import { buildDefaultLevels } from '../../utils/defaultSides'
import { toProgramExportPayload } from '../../utils/programConfig'
import {
  createEmptyVocabItem,
  primaryTextAttributeKey,
  validateVocabItems,
} from '../../utils/vocabItems'
import {
  PRESET_SCHEMA_ROW_SPECS,
  SCHEMA_UI_TYPES,
  createSchemaRow,
  expandSchemaFields,
  newEmptySchemaRow,
  slugProgramId,
} from '../../utils/schemaField'
import { CardSetupStep } from './CardSetupStep'
import { DisplayElementEditorStep } from './DisplayElementEditorStep'
import { SchemaFieldList } from './SchemaFieldList'
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

const FIELD_TYPE_KEYS: Record<SchemaFieldUiType, TranslationKey> = {
  text: 'createProgram.fieldType.text',
  image: 'createProgram.fieldType.image',
  'text+audio': 'createProgram.fieldType.textAudio',
}

function buildPresetFields(t: (key: TranslationKey) => string): SchemaFieldRow[] {
  return PRESET_SCHEMA_ROW_SPECS.map((spec) =>
    createSchemaRow({
      name: t(spec.labelKey),
      uiType: spec.uiType,
      key: spec.key,
    }),
  )
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
  const { t, langPair } = useLanguagePair()
  const isWideLayout = useWizardWideLayout()
  const [step, setStep] = useState<WizardStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [fields, setFields] = useState<SchemaFieldRow[]>(() => buildPresetFields(t))
  const [levels, setLevels] = useState<LevelRangeDraft[]>([])
  const [activeLevelId, setActiveLevelId] = useState('')
  const [editingSideId, setEditingSideId] = useState<string | null>(null)
  const [editingDisplayIndex, setEditingDisplayIndex] = useState<number | null>(null)
  const [vocabItems, setVocabItems] = useState<VocabItemDraft[]>([])

  const programId = useMemo(() => slugProgramId(name), [name])
  const expandedAttributes = useMemo(() => expandSchemaFields(fields), [fields])
  const editingSide = useMemo(
    () => (editingSideId ? findSide(levels, editingSideId) : undefined),
    [levels, editingSideId],
  )

  const exportPayload = useMemo(
    () => toProgramExportPayload(programId, name.trim(), expandedAttributes, levels, vocabItems),
    [programId, name, expandedAttributes, levels, vocabItems],
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
    const valid = fields.every((f) => f.name.trim())
    if (!valid || fields.length === 0) {
      window.alert(t('createProgram.validation.fieldsRequired'))
      return
    }
    const attributes = expandSchemaFields(fields)
    const defaultLevels = buildDefaultLevels(attributes)
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
      setVocabItems([createEmptyVocabItem(expandedAttributes)])
    }
    setStep('vocabEntry')
  }

  function handleContinueVocab() {
    const result = validateVocabItems(vocabItems, levels, expandedAttributes)
    if (!result.ok) {
      if (result.reason === 'empty') {
        window.alert(t('createProgram.validation.vocabEmpty'))
      } else if (result.reason === 'missingMedia') {
        window.alert(t('createProgram.validation.vocabRequiredMedia'))
      } else {
        window.alert(t('createProgram.validation.vocabRequiredFields'))
      }
      return
    }
    console.info('[meup-web mock] create program', { langPair, ...exportPayload })
    setStep('done')
  }

  function updateField(id: string, patch: Partial<SchemaFieldRow>) {
    setFields((prev) =>
      prev.map((row) => {
        if (row.id !== id) {
          return row
        }
        return { ...row, ...patch }
      }),
    )
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((row) => row.id !== id))
  }

  function addField(uiType: SchemaFieldUiType) {
    setFields((prev) => [...prev, { ...newEmptySchemaRow(), uiType }])
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
      <p className="text-xs text-text-muted lg:text-sm">{t('createProgram.pairHint', { pair: langPair })}</p>
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

          <div className="mt-5">
            <SchemaFieldList
              fields={fields}
              fieldTypeKeys={FIELD_TYPE_KEYS}
              onReorder={setFields}
              onUpdate={updateField}
              onRemove={removeField}
              t={t}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SCHEMA_UI_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addField(type)}
                className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent"
              >
                + {t('createProgram.stepSchema.add')} {t(FIELD_TYPE_KEYS[type])}
              </button>
            ))}
          </div>

          <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
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
          attributes={expandedAttributes}
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
          attributes={expandedAttributes}
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
            attributes={expandedAttributes}
            onChange={(next) => updateSide(editingSide.id, next)}
            onSelectDisplayIndex={openDisplayEditor}
            onBack={closeDisplayEditor}
            t={t}
          />
        )}

      {step === 'vocabEntry' && (
        <VocabEntryStep
          programName={name}
          attributes={expandedAttributes}
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
            {t('createProgram.stepDone.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{t('createProgram.stepDone.subtitle')}</p>

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
                {expandedAttributes.map((attr) => (
                  <div
                    key={attr.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate text-text">{attr.name || '—'}</span>
                    <span className="shrink-0 text-text-muted">{attr.type}</span>
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
                    const key = primaryTextAttributeKey(expandedAttributes)
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

          <p className="mt-4 text-xs text-text-muted">{t('createProgram.stepDone.mockNote')}</p>

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
