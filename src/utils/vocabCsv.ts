import type { ItemSchemaAttribute, VocabItemDraft } from '../types/program'
import { createEmptyVocabItem, textAttributes } from './vocabItems'

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

function headerLabel(attr: ItemSchemaAttribute): string {
  return attr.name.trim() || attr.key
}

/** CSV template: header row uses display names; one blank example row. */
export function buildVocabCsvTemplate(attributes: ItemSchemaAttribute[]): string {
  const cols = textAttributes(attributes)
  const header = cols.map((attr) => escapeCsvCell(headerLabel(attr))).join(',')
  const blank = cols.map(() => '').join(',')
  return `${UTF8_BOM}${header}\r\n${blank}\r\n`
}

export function downloadVocabCsvTemplate(programName: string, attributes: ItemSchemaAttribute[]): void {
  const slug = programName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const filename = `${slug || 'program'}-vocab-template.csv`
  const blob = new Blob([buildVocabCsvTemplate(attributes)], { type: 'text/csv;charset=utf-8' })
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
  return out.map((value) => value.trim())
}

export function parseCsvText(raw: string): string[][] {
  const normalized = stripBom(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((line) => line.length > 0)
  if (lines.length === 0) {
    return []
  }
  const delimiter = detectDelimiter(lines[0])
  return lines.map((line) => parseCsvLine(line, delimiter))
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

/** Map CSV column index → attribute key (match display name, then key). */
export function mapCsvHeadersToTextKeys(
  headers: string[],
  attributes: ItemSchemaAttribute[],
): Map<number, string> {
  const textAttrs = textAttributes(attributes)
  const byName = new Map<string, string>()
  const byKey = new Map<string, string>()
  for (const attr of textAttrs) {
    byName.set(normalizeHeader(headerLabel(attr)), attr.key)
    byKey.set(normalizeHeader(attr.key), attr.key)
  }

  const mapping = new Map<number, string>()
  headers.forEach((header, index) => {
    const norm = normalizeHeader(header)
    if (!norm) {
      return
    }
    const key = byName.get(norm) ?? byKey.get(norm)
    if (key) {
      mapping.set(index, key)
    }
  })
  return mapping
}

function rowHasAnyMappedValue(cells: string[], columnToKey: Map<number, string>): boolean {
  for (const [index] of columnToKey) {
    if (cells[index]?.trim()) {
      return true
    }
  }
  return false
}

export function importVocabItemsFromCsvText(
  raw: string,
  attributes: ItemSchemaAttribute[],
): VocabCsvImportResult {
  const rows = parseCsvText(raw)
  if (rows.length === 0) {
    return { ok: false, error: { reason: 'emptyFile' } }
  }

  const [headerRow, ...dataRows] = rows
  const columnToKey = mapCsvHeadersToTextKeys(headerRow, attributes)
  if (columnToKey.size === 0) {
    return { ok: false, error: { reason: 'noMappedColumns', headers: headerRow } }
  }

  const items: VocabItemDraft[] = []
  for (const row of dataRows) {
    if (!rowHasAnyMappedValue(row, columnToKey)) {
      continue
    }
    const item = createEmptyVocabItem(attributes)
    for (const [index, key] of columnToKey) {
      item.values[key] = row[index]?.trim() ?? ''
    }
    items.push(item)
  }

  if (items.length === 0) {
    return { ok: false, error: { reason: 'noDataRows' } }
  }

  return { ok: true, items, rowCount: items.length }
}
