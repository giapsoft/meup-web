import { useEffect, useMemo, useState } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import { useWizardWideLayout } from '../../hooks/useMediaQuery'
import { CardSetupStep } from '../../pages/create-program/CardSetupStep'
import { DisplayElementEditorStep } from '../../pages/create-program/DisplayElementEditorStep'
import { ItemSchemaEditor } from '../../pages/create-program/ItemSchemaEditor'
import { SideEditorStep } from '../../pages/create-program/SideEditorStep'
import {
  WIZARD_ACTION_PRIMARY,
  WIZARD_ACTION_SECONDARY,
  WIZARD_ACTIONS,
} from '../../pages/create-program/wizardLayout'
import type {
  ItemSchemaEditorState,
  LevelRangeDraft,
  SideDraft,
} from '../../types/program'
import type { ProgramConfigWeb, SchemaAttrWeb } from '../../types/webConfig'
import { editorStateFromWebConfig } from '../../utils/customConfigState'
import {
  validateCustomConfigLevels,
  validateCustomConfigSchema,
} from '../../utils/customConfigValidation'
import { programConfigWebFromEditor } from '../../utils/programConfigWeb'
import { itemSchemaFromEditor } from '../../utils/schemaField'

export type ProgramConfigWizardStep = 'schema' | 'levels' | 'sideEdit' | 'displayEdit'

export type ProgramConfigWizardProps = {
  /** Bump / change to reset editor state from `initialConfig`. */
  resetKey?: string | number
  initialConfig: ProgramConfigWeb
  programName: string
  t: (key: TranslationKey, params?: MessageParams) => string
  showGenerateDescriptions?: boolean
  /** Override product-create generate (e.g. admin free endpoint). */
  generateDescriptions?: (attrs: SchemaAttrWeb[]) => Promise<SchemaAttrWeb[]>
  studyLangLabel?: string
  nativeLangLabel?: string
  /** Primary action on levels step (Apply / Save). */
  finishLabel: string
  /** Schema-step secondary (Close / Cancel). Omit to hide. */
  cancelLabel?: string
  onCancel?: () => void
  /** Called after levels validation with the built ProgramConfigWeb. */
  onFinish: (config: ProgramConfigWeb) => void
  /** Optional class for the scrollable body (dialog vs inline page). */
  className?: string
  /** Disable finish while parent is saving. */
  finishDisabled?: boolean
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

/** Shared schema → levels → side/display wizard used by user CustomConfig and admin default config. */
export function ProgramConfigWizard({
  resetKey,
  initialConfig,
  programName,
  t,
  showGenerateDescriptions = false,
  generateDescriptions,
  studyLangLabel,
  nativeLangLabel,
  finishLabel,
  cancelLabel,
  onCancel,
  onFinish,
  className,
  finishDisabled = false,
}: ProgramConfigWizardProps) {
  const isWideLayout = useWizardWideLayout()
  const [step, setStep] = useState<ProgramConfigWizardStep>('schema')
  const [itemSchemaEditor, setItemSchemaEditor] = useState<ItemSchemaEditorState>(() =>
    editorStateFromWebConfig(initialConfig).itemSchemaEditor,
  )
  const [levels, setLevels] = useState<LevelRangeDraft[]>(() =>
    editorStateFromWebConfig(initialConfig).levels,
  )
  const [activeLevelId, setActiveLevelId] = useState('')
  const [editingSideId, setEditingSideId] = useState<string | null>(null)
  const [editingDisplayIndex, setEditingDisplayIndex] = useState<number | null>(null)

  useEffect(() => {
    const { itemSchemaEditor: editor, levels: nextLevels } = editorStateFromWebConfig(initialConfig)
    setItemSchemaEditor(editor)
    setLevels(nextLevels)
    setActiveLevelId(nextLevels[0]?.id ?? '')
    setStep('schema')
    setEditingSideId(null)
    setEditingDisplayIndex(null)
    // Only reset when parent bumps resetKey (open dialog / reload from API).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [resetKey])

  const itemSchema = useMemo(() => itemSchemaFromEditor(itemSchemaEditor), [itemSchemaEditor])
  const editingSide = editingSideId ? findSide(levels, editingSideId) : undefined

  function updateSide(sideId: string, nextSide: SideDraft) {
    setLevels((prev) =>
      prev.map((level) => ({
        ...level,
        sides: level.sides.map((side) => (side.id === sideId ? nextSide : side)),
      })),
    )
  }

  function handleContinueSchema() {
    if (!validateCustomConfigSchema(itemSchemaEditor)) {
      if (!itemSchemaEditor.fields.every((f) => f.label.trim())) {
        window.alert(t('createProgram.validation.fieldsRequired'))
        return
      }
      window.alert(t('createProgram.validation.schemaLangRequired'))
      return
    }
    setStep('levels')
  }

  function handleFinishLevels() {
    if (!validateCustomConfigLevels(levels)) {
      window.alert(t('createProgram.customConfig.validation.levels'))
      return
    }
    onFinish(programConfigWebFromEditor(itemSchemaEditor, levels))
  }

  const stepTitle =
    step === 'schema'
      ? t('createProgram.customConfig.stepSchemaTitle')
      : step === 'levels'
        ? t('createProgram.customConfig.stepLevelsTitle')
        : t('createProgram.customConfig.stepSideTitle')

  return (
    <div className={className}>
      <header className="shrink-0 border-b border-border px-0 pb-4 sm:pb-4">
        <h2 className="text-lg font-semibold text-text sm:text-xl">{stepTitle}</h2>
        {step === 'schema' || step === 'levels' ? (
          <p className="mt-1 text-sm text-text-muted">{programName}</p>
        ) : null}
      </header>

      <div
        className={[
          'min-h-0 flex-1',
          step === 'sideEdit' || step === 'displayEdit' ? 'pt-0' : 'pt-4',
        ].join(' ')}
      >
        {step === 'schema' && (
          <>
            <p className="text-sm text-text-muted">{t('createProgram.stepSchema.hint')}</p>
            <div className="mt-4">
              <ItemSchemaEditor
                value={itemSchemaEditor}
                onChange={setItemSchemaEditor}
                t={t}
                showGenerateDescriptions={showGenerateDescriptions}
                generateDescriptions={generateDescriptions}
                studyLangLabel={studyLangLabel}
                nativeLangLabel={nativeLangLabel}
              />
            </div>
            <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
              {cancelLabel && onCancel ? (
                <button type="button" onClick={onCancel} className={WIZARD_ACTION_SECONDARY}>
                  {cancelLabel}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={handleContinueSchema} className={WIZARD_ACTION_PRIMARY}>
                {t('createProgram.stepSchema.continue')}
              </button>
            </div>
          </>
        )}

        {step === 'levels' && (
          <CardSetupStep
            programName={programName}
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
            onContinue={handleFinishLevels}
            continueLabel={finishLabel}
            continueDisabled={finishDisabled}
            t={t}
          />
        )}

        {step === 'sideEdit' && editingSide && (
          <SideEditorStep
            side={editingSide}
            schema={itemSchema}
            editingDisplayIndex={isWideLayout ? editingDisplayIndex : null}
            onChange={(next) => updateSide(editingSide.id, next)}
            onEditDisplay={(index) => {
              setEditingDisplayIndex(index)
              if (!isWideLayout) {
                setStep('displayEdit')
              }
            }}
            onCloseDisplayEdit={() => setEditingDisplayIndex(null)}
            onBack={() => {
              setEditingSideId(null)
              setEditingDisplayIndex(null)
              setStep('levels')
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
              onSelectDisplayIndex={(index) => setEditingDisplayIndex(index)}
              onBack={() => setStep('sideEdit')}
              t={t}
            />
          )}
      </div>
    </div>
  )
}
