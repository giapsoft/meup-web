import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import type { TranslationKey } from '../../i18n/types'
import type { SchemaFieldRow, SchemaFieldUiType } from '../../types/program'
import {
  PRESET_SCHEMA_ROW_SPECS,
  SCHEMA_UI_TYPES,
  createSchemaRow,
  expandSchemaFields,
  newEmptySchemaRow,
  slugFieldKey,
  slugProgramId,
} from '../../utils/schemaField'

type WizardStep = 'name' | 'schema' | 'done'

const FIELD_TYPE_KEYS: Record<SchemaFieldUiType, TranslationKey> = {
  text: 'createProgram.fieldType.text',
  image: 'createProgram.fieldType.image',
  'text+audio': 'createProgram.fieldType.textAudio',
}

function buildPresetFields(t: (key: TranslationKey) => string): SchemaFieldRow[] {
  return PRESET_SCHEMA_ROW_SPECS.map((spec) =>
    createSchemaRow({
      label: t(spec.labelKey),
      uiType: spec.uiType,
      keyBase: spec.keyBase,
    }),
  )
}

export function CreateProgramWizard() {
  const { t, langPair } = useLanguagePair()
  const [step, setStep] = useState<WizardStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [fields, setFields] = useState<SchemaFieldRow[]>(() => buildPresetFields(t))

  const programId = useMemo(() => slugProgramId(name), [name])
  const expandedAttributes = useMemo(() => expandSchemaFields(fields), [fields])

  function handleStart() {
    if (!name.trim()) {
      setNameError(t('createProgram.validation.nameRequired'))
      return
    }
    setNameError('')
    setStep('schema')
  }

  function handleContinueSchema() {
    const valid = fields.every((f) => f.label.trim())
    if (!valid || fields.length === 0) {
      window.alert(t('createProgram.validation.fieldsRequired'))
      return
    }
    const attributes = expandSchemaFields(fields)
    console.info('[tach-web mock] create program', {
      id: slugProgramId(name),
      name: name.trim(),
      langPair,
      itemSchema: { attributes },
    })
    setStep('done')
  }

  function updateField(id: string, patch: Partial<SchemaFieldRow>) {
    setFields((prev) =>
      prev.map((row) => {
        if (row.id !== id) {
          return row
        }
        const next = { ...row, ...patch }
        if (patch.label !== undefined && patch.keyBase === undefined) {
          next.keyBase = slugFieldKey(patch.label)
        }
        return next
      }),
    )
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((row) => row.id !== id))
  }

  function addField(uiType: SchemaFieldUiType) {
    setFields((prev) => [...prev, { ...newEmptySchemaRow(), uiType }])
  }

  function moveField(id: string, delta: number) {
    setFields((prev) => {
      const index = prev.findIndex((r) => r.id === id)
      if (index < 0) {
        return prev
      }
      const nextIndex = index + delta
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev
      }
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, item)
      return copy
    })
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-xs text-text-muted">{t('createProgram.pairHint', { pair: langPair })}</p>

      {step === 'name' && (
        <section className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
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
          {nameError && <p className="mt-2 text-sm text-amber-300">{nameError}</p>}
          <button
            type="button"
            onClick={handleStart}
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-surface transition hover:opacity-90 sm:text-base"
          >
            {t('createProgram.stepName.start')}
          </button>
        </section>
      )}

      {step === 'schema' && (
        <section className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
          <h1 className="text-xl font-semibold text-text sm:text-2xl">
            {t('createProgram.stepSchema.title')}
          </h1>
          <p className="mt-2 text-sm text-text-muted">{t('createProgram.stepSchema.hint')}</p>
          <p className="mt-1 text-xs text-text-muted">{name}</p>

          <ul className="mt-5 space-y-3">
            {fields.map((row, index) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center"
              >
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveField(row.id, -1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted disabled:opacity-30"
                    aria-label={t('createProgram.stepSchema.moveUp')}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(row.id, 1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted disabled:opacity-30"
                    aria-label={t('createProgram.stepSchema.moveDown')}
                  >
                    ↓
                  </button>
                </div>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => updateField(row.id, { label: e.target.value })}
                  placeholder={t('createProgram.stepSchema.fieldLabel')}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                />
                <select
                  value={row.uiType}
                  onChange={(e) =>
                    updateField(row.id, { uiType: e.target.value as SchemaFieldUiType })
                  }
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                >
                  {SCHEMA_UI_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(FIELD_TYPE_KEYS[type])}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeField(row.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-500/10"
                  aria-label={t('createProgram.stepSchema.remove')}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

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

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setStep('name')}
              className="flex-1 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-medium text-text-muted hover:bg-surface-hover"
            >
              {t('createProgram.stepSchema.back')}
            </button>
            <button
              type="button"
              onClick={handleContinueSchema}
              className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-surface hover:opacity-90"
            >
              {t('createProgram.stepSchema.continue')}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="mt-4 rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
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
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-3 py-2 font-mono text-xs"
                  >
                    <span className="text-text">{attr.key}</span>
                    <span className="text-text-muted">{attr.type}</span>
                  </div>
                ))}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-text-muted">{t('createProgram.stepDone.mockNote')}</p>

          <Link
            to="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface-card px-4 py-3 text-sm font-medium text-text no-underline hover:bg-surface-hover"
          >
            {t('createProgram.stepDone.backHome')}
          </Link>
        </section>
      )}
    </main>
  )
}
