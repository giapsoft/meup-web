/** Parsed product entry from `GET /api/product/device-programs` compact wire format v1. */
export type DeviceProgramProductDto = {
  id: string
  name: string
  description: string
  metaData: string
  totalSize: number
  files: Array<{
    id: string
    storagePath: string
    fileSize: number
  }>
}

export type DeviceProgramsPairDto = {
  langPair: string
  myProducts: DeviceProgramProductDto[]
  sharedWithMe: DeviceProgramProductDto[]
  buyed: DeviceProgramProductDto[]
}

export type DeviceProgramsDto = {
  pairs: DeviceProgramsPairDto[]
}

const COMPACT_VERSION = 1

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`invalid ${label}`)
  }
  return value
}

function asNumber(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  throw new Error(`invalid ${label}`)
}

function parseFile(row: unknown): DeviceProgramProductDto['files'][number] {
  if (!Array.isArray(row) || row.length < 3) {
    throw new Error('invalid file row')
  }
  return {
    id: asString(row[0], 'file id'),
    storagePath: asString(row[1], 'file storagePath'),
    fileSize: asNumber(row[2], 'file fileSize'),
  }
}

function parseProduct(row: unknown): DeviceProgramProductDto {
  if (!Array.isArray(row) || row.length < 6) {
    throw new Error('invalid product row')
  }
  const filesRaw = row[5]
  const files = Array.isArray(filesRaw) ? filesRaw.map(parseFile) : []
  return {
    id: asString(row[0], 'product id'),
    name: asString(row[1], 'product name'),
    description: asString(row[2], 'product description'),
    metaData: asString(row[3], 'product metaData'),
    totalSize: asNumber(row[4], 'product totalSize'),
    files,
  }
}

function parseProducts(rows: unknown): DeviceProgramProductDto[] {
  if (!Array.isArray(rows)) {
    return []
  }
  return rows.map(parseProduct)
}

function parsePair(row: unknown): DeviceProgramsPairDto {
  if (!Array.isArray(row) || row.length < 4) {
    throw new Error('invalid pair row')
  }
  return {
    langPair: asString(row[0], 'langPair'),
    myProducts: parseProducts(row[1]),
    sharedWithMe: parseProducts(row[2]),
    buyed: parseProducts(row[3]),
  }
}

/** Decode compact v1 array from `GET /api/product/device-programs` → `data`. */
export function parseDeviceProgramsCompact(raw: unknown): DeviceProgramsDto {
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error('invalid device programs root')
  }
  const version = asNumber(raw[0], 'version')
  if (version !== COMPACT_VERSION) {
    throw new Error(`unsupported device programs version ${version}`)
  }
  const pairRows = raw[1]
  if (!Array.isArray(pairRows)) {
    throw new Error('invalid device programs pairs')
  }
  return {
    pairs: pairRows.map(parsePair),
  }
}

export function sharedProductsForLangPair(
  programs: DeviceProgramsDto,
  langPair: string,
): DeviceProgramProductDto[] {
  const pair = programs.pairs.find((p) => p.langPair === langPair)
  return pair?.sharedWithMe ?? []
}
