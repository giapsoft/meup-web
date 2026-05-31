import { useRef } from 'react'
import type { MessageParams, TranslationKey } from '../../i18n/types'
import type { ItemSchemaAttribute, VocabItemDraft } from '../../types/program'
import { downloadVocabCsvTemplate, importVocabItemsFromCsvText } from '../../utils/vocabCsv'
import { revokeVocabItemMedia } from '../../utils/vocabMedia'

type VocabCsvImportBarProps = {
  programName: string
  attributes: ItemSchemaAttribute[]
  items: VocabItemDraft[]
  onItemsChange: (items: VocabItemDraft[]) => void
  onImported: (firstItemId: string | null) => void
  t: (key: TranslationKey, params?: MessageParams) => string
}

export function VocabCsvImportBar({
  programName,
  attributes,
  items,
  onItemsChange,
  onImported,
  t,
}: VocabCsvImportBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDownloadTemplate() {
    downloadVocabCsvTemplate(programName, attributes)
  }

  function pickCsvFile() {
    fileInputRef.current?.click()
  }

  function csvErrorMessage(error: { reason: string }): string {
    switch (error.reason) {
      case 'emptyFile':
        return t('createProgram.validation.csvEmpty')
      case 'noDataRows':
        return t('createProgram.validation.csvNoDataRows')
      case 'noMappedColumns':
        return t('createProgram.validation.csvNoMappedColumns')
      default:
        return t('createProgram.validation.csvImportFailed')
    }
  }

  function applyImport(imported: VocabItemDraft[]) {
    const hasExisting = items.some((item) =>
      Object.values(item.values).some((value) => value.trim()),
    )
    let next = imported
    if (hasExisting) {
      const replace = window.confirm(t('createProgram.validation.csvImportConfirmReplace'))
      if (!replace) {
        next = [...items, ...imported]
      } else {
        for (const item of items) {
          revokeVocabItemMedia(item)
        }
      }
    }
    onItemsChange(next)
    onImported(next[0]?.id ?? null)
    window.alert(t('createProgram.stepVocab.csvImported', { count: imported.length }))
  }

  async function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0]
    const input = fileInputRef.current
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const result = importVocabItemsFromCsvText(text, attributes)
      if (!result.ok) {
        window.alert(csvErrorMessage(result.error))
        return
      }
      applyImport(result.items)
    } catch {
      window.alert(t('createProgram.validation.csvImportFailed'))
    } finally {
      if (input) {
        input.value = ''
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card p-3">
      <p className="text-sm font-medium text-text">{t('createProgram.stepVocab.csvTitle')}</p>
      <p className="mt-1 text-xs text-text-muted">{t('createProgram.stepVocab.csvHint')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-surface-hover"
        >
          {t('createProgram.stepVocab.csvDownloadTemplate')}
        </button>
        <button
          type="button"
          onClick={pickCsvFile}
          className="min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-medium text-accent hover:border-accent"
        >
          {t('createProgram.stepVocab.csvImport')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => void handleFileChange(e.target.files)}
        />
      </div>
    </div>
  )
}
