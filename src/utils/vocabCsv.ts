import type { ItemSchema, VocabItemDraft } from '../types/program'
import { createEmptyVocabItem, textAttrs } from './vocabItems'

const UTF8_BOM = '\uFEFF'

export type VocabCsvImportError =
  | { reason: 'emptyFile' }
  | { reason: 'noDataRows' }
  | { reason: 'noMappedColumns'; headers: string[] }

export type VocabCsvImportResult =
  | { ok: true; items: VocabItemDraft[]; rowCount: number }
  | { ok: false; error: VocabCsvImportError }

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function headerLabel(attr: ItemSchema['attrs'][number]): string {
  return attr.name.trim() || attr.key
}

/** CSV template: header row uses display names; one blank example row. */
export function buildVocabCsvTemplate(schema: ItemSchema): string {
  const cols = textAttrs(schema)
  const header = cols.map((attr) => escapeCsvCell(headerLabel(attr))).join(',')
  const blank = cols.map(() => '').join(',')
  return `${UTF8_BOM}${header}\r\n${blank}\r\n`
}

export function downloadVocabCsvTemplate(programName: string, schema: ItemSchema): void {
  const slug = programName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const filename = `${slug || 'program'}-vocab-template.csv`
  const blob = new Blob([buildVocabCsvTemplate(schema)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text
}

function detectDelimiter(line: string): ',' | '\t' {
  const commas = (line.match(/,/g) ?? []).length
  const tabs = (line.match(/\t/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

/** Parse one CSV record line (handles quoted fields). */
function parseCsvLine(line: string, delimiter: ',' | '\t'): string[] {
  const out: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delimiter) {
      out.push(cell)
      cell = ''
      continue
    }
    cell += ch
  }
  out.push(cell)
  return out
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

function mapHeadersToKeys(
  headers: string[],
  schema: ItemSchema,
): Map<number, string> | null {
  const cols = textAttrs(schema)
  const byName = new Map<string, string>()
  const byKey = new Map<string, string>()
  for (const attr of cols) {
    byName.set(normalizeHeader(headerLabel(attr)), attr.key)
    byKey.set(normalizeHeader(attr.key), attr.key)
  }

  const mapping = new Map<number, string>()
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i])
    const key = byName.get(h) ?? byKey.get(h)
    if (key) {
      mapping.set(i, key)
    }
  }
  return mapping.size > 0 ? mapping : null
}

export function parseVocabCsvText(
  text: string,
  schema: ItemSchema,
): VocabCsvImportResult {
  const trimmed = stripBom(text.trim())
  if (!trimmed) {
    return { ok: false, error: { reason: 'emptyFile' } }
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) {
    return { ok: false, error: { reason: 'noDataRows' } }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter)
  const columnMap = mapHeadersToKeys(headers, schema)
  if (!columnMap) {
    return { ok: false, error: { reason: 'noMappedColumns', headers } }
  }

  const items: VocabItemDraft[] = []
  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const cells = parseCsvLine(lines[rowIdx], delimiter)
    const item = createEmptyVocabItem(schema)
    let hasData = false
    for (const [colIdx, key] of columnMap) {
      const value = (cells[colIdx] ?? '').trim()
      if (value) {
        hasData = true
      }
      item.values[key] = value
    }
    if (hasData) {
      items.push(item)
    }
  }

  if (items.length === 0) {
    return { ok: false, error: { reason: 'noDataRows' } }
  }

  return { ok: true, items, rowCount: items.length }
}

/** @deprecated alias */
export const importVocabItemsFromCsvText = parseVocabCsvText
