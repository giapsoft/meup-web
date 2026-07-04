import { useEffect, useId, useMemo, useState } from 'react'
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
  SchemaFieldUiType,
  SideDraft,
} from '../../types/program'
import type { ProgramConfigWeb } from '../../types/webConfig'
import { editorStateFromWebConfig } from '../../utils/customConfigState'
import {
  validateCustomConfigLevels,
  validateCustomConfigSchema,
} from '../../utils/customConfigValidation'
import { programConfigWebFromEditor } from '../../utils/programConfigWeb'
import { itemSchemaFromEditor } from '../../utils/schemaField'

type DialogStep = 'schema' | 'levels' | 'sideEdit' | 'displayEdit'

const FIELD_TYPE_KEYS: Record<SchemaFieldUiType, TranslationKey> = {
  text: 'createProgram.fieldType.text',
  'text+audio': 'createProgram.fieldType.textAudio',
}

type CustomConfigDialogProps = {
  open: boolean
  programName: string
  initialConfig: ProgramConfigWeb
  onClose: () => void
  onApply: (config: ProgramConfigWeb) => void
  t: (key: TranslationKey, params?: MessageParams) => string
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

export function CustomConfigDialog({
  open,
  programName,
  initialConfig,
  onClose,
  onApply,
  t,
}: CustomConfigDialogProps) {
  const titleId = useId()
  const isWideLayout = useWizardWideLayout()
  const [step, setStep] = useState<DialogStep>('schema')
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
    if (!open) {
      return
    }
    const { itemSchemaEditor: editor, levels: nextLevels } = editorStateFromWebConfig(initialConfig)
    setItemSchemaEditor(editor)
    setLevels(nextLevels)
    setActiveLevelId(nextLevels[0]?.id ?? '')
    setStep('schema')
    setEditingSideId(null)
    setEditingDisplayIndex(null)
  }, [open, initialConfig])

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

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

  function handleApplyLevels() {
    if (!validateCustomConfigLevels(levels)) {
      window.alert(t('createProgram.customConfig.validation.levels'))
      return
    }
    onApply(programConfigWebFromEditor(itemSchemaEditor, levels))
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label={t('createProgram.customConfig.close')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface-raised shadow-xl sm:rounded-2xl"
      >
        <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-text sm:text-xl">
            {step === 'schema'
              ? t('createProgram.customConfig.stepSchemaTitle')
              : step === 'levels'
                ? t('createProgram.customConfig.stepLevelsTitle')
                : t('createProgram.customConfig.stepSideTitle')}
          </h2>
          <p className="mt-1 text-sm text-text-muted">{programName}</p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {step === 'schema' && (
            <>
              <p className="text-sm text-text-muted">{t('createProgram.stepSchema.hint')}</p>
              <div className="mt-4">
                <ItemSchemaEditor
                  value={itemSchemaEditor}
                  onChange={setItemSchemaEditor}
                  fieldTypeKeys={FIELD_TYPE_KEYS}
                  t={t}
                  showGenerateDescriptions
                />
              </div>
              <div className={`${WIZARD_ACTIONS} sm:justify-between`}>
                <button type="button" onClick={onClose} className={WIZARD_ACTION_SECONDARY}>
                  {t('createProgram.customConfig.close')}
                </button>
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
              onContinue={handleApplyLevels}
              t={t}
            />
          )}

          {step === 'sideEdit' && editingSide && (
            <SideEditorStep
              programName={programName}
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
    </div>
  )
}
