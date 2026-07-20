/** Schema attr key rules — aligned with meup-api `ValidateSchemaAttrKey`. */

export const SCHEMA_ATTR_KEY_MIN = 1
export const SCHEMA_ATTR_KEY_MAX = 30

const KEY_PATTERN = /^[\p{L}\p{N} ]+$/u

/** Rune count (Unicode code points), not UTF-16 length. */
export function schemaAttrKeyRuneCount(key: string): number {
  return [...key].length
}

export type SchemaAttrKeyError =
  | 'empty'
  | 'length'
  | 'charset'
  | 'reserved'
  | 'duplicate'

export function validateSchemaAttrKey(raw: string): SchemaAttrKeyError | null {
  const key = raw.trim()
  if (!key) {
    return 'empty'
  }
  const n = schemaAttrKeyRuneCount(key)
  if (n < SCHEMA_ATTR_KEY_MIN || n > SCHEMA_ATTR_KEY_MAX) {
    return 'length'
  }
  if (key.toLowerCase() === 'image') {
    return 'reserved'
  }
  if (!KEY_PATTERN.test(key)) {
    return 'charset'
  }
  return null
}

export function isValidSchemaAttrKey(raw: string): boolean {
  return validateSchemaAttrKey(raw) === null
}

/** True when every field key is valid and unique (trimmed). */
export function validateSchemaAttrKeysUnique(keys: string[]): SchemaAttrKeyError | null {
  const seen = new Set<string>()
  for (const raw of keys) {
    const err = validateSchemaAttrKey(raw)
    if (err) {
      return err
    }
    const key = raw.trim()
    if (seen.has(key)) {
      return 'duplicate'
    }
    seen.add(key)
  }
  return null
}
