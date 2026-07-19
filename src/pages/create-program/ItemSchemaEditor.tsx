import { useState } from 'react'
import { ApiError } from '../../api/client'
import { generateProductCreateDescription } from '../../api/productCreateMedia'
import { useAccount } from '../../context/AccountProvider'
import { useLanguagePair } from '../../context/LanguagePairProvider'
import { findLanguage } from '../../data/mock'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaEditorState, SchemaFieldRow } from '../../types/program'
import { newEmptySchemaRow } from '../../utils/schemaField'
import { SchemaFieldList } from './SchemaFieldList'

type ItemSchemaEditorProps = {
  value: ItemSchemaEditorState
  onChange: (next: ItemSchemaEditorState) => void
  t: (key: TranslationKey, params?: MessageParams) => string
  /** Show generate-description action (CustomConfig / create flows). */
  showGenerateDescriptions?: boolean
}

export function ItemSchemaEditor({
  value,
  onChange,
  t,
  showGenerateDescriptions = false,
}: ItemSchemaEditorProps) {
  const { refreshAccount } = useAccount()
  const { nativeLang, studyLang } = useLanguagePair()
  const studyLangLabel = findLanguage(studyLang)?.name ?? studyLang
  const nativeLangLabel = findLanguage(nativeLang)?.name ?? nativeLang
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  function updateField(id: string, patch: Partial<SchemaFieldRow>) {
    onChange({
      ...value,
      fields: value.fields.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    })
  }

  function removeField(id: string) {
    onChange({ ...value, fields: value.fields.filter((row) => row.id !== id) })
  }

  function addField() {
    onChange({ ...value, fields: [...value.fields, newEmptySchemaRow()] })
  }

  async function handleGenerateDescriptions() {
    if (value.fields.length === 0) {
      return
    }
    setGenerating(true)
    setGenerateError('')
    try {
      const result = await generateProductCreateDescription({
        attrs: value.fields.map((row) => ({
          key: row.key,
          label: row.label.trim() || row.key,
          description: row.description ?? '',
          type: row.uiType,
          ...(row.langType ? { langType: row.langType } : {}),
        })),
      })
      const byKey = new Map(result.attrs.map((attr) => [attr.key, attr]))
      onChange({
        ...value,
        fields: value.fields.map((row) => {
          const updated = byKey.get(row.key)
          if (!updated?.description?.trim()) {
            return row
          }
          return { ...row, description: updated.description }
        }),
      })
      await refreshAccount()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'request_failed'
      setGenerateError(code)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card/50 p-3 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {t('createProgram.stepSchema.itemSchemaTitle')}
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-3">
        <input
          type="checkbox"
          checked={value.hasImage}
          onChange={(e) => onChange({ ...value, hasImage: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
        />
        <span>
          <span className="block text-sm font-medium text-text">
            {t('createProgram.stepSchema.hasImage')}
          </span>
          <span className="mt-0.5 block text-xs text-text-muted">
            {t('createProgram.stepSchema.hasImageHint')}
          </span>
        </span>
      </label>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-text-muted">
        {t('createProgram.stepSchema.attributesTitle')}
      </p>

      <div className="mt-2">
        <SchemaFieldList
          fields={value.fields}
          studyLangLabel={studyLangLabel}
          nativeLangLabel={nativeLangLabel}
          onReorder={(fields) => onChange({ ...value, fields })}
          onUpdate={updateField}
          onRemove={removeField}
          t={t}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addField()}
          className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent"
        >
          + {t('createProgram.stepSchema.add')}
        </button>
        {showGenerateDescriptions && (
          <button
            type="button"
            onClick={() => void handleGenerateDescriptions()}
            disabled={generating || value.fields.length === 0}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-accent hover:bg-surface-hover disabled:opacity-50"
          >
            {generating
              ? t('createProgram.stepSchema.generateDescriptionsLoading')
              : t('createProgram.stepSchema.generateDescriptions')}
          </button>
        )}
      </div>
      {generateError && (
        <p className="mt-2 text-xs text-warning">{generateError}</p>
      )}
    </div>
  )
}
