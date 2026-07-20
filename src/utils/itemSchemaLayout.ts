import type { ItemSchema, LangType, SchemaAttr } from '../types/program'
import { IMAGE_MEDIA_KEY } from '../types/program'

export type LayoutPropType = 'text' | 'audio' | 'image' | 'undefined'

/** Text+audio schema columns (order preserved). */
export function textAudioAttrs(schema: ItemSchema): SchemaAttr[] {
  return schema.attrs.filter((a) => a.type === 'text+audio')
}

/** Index past last audio column; image slot when `hasImage`. */
export function maxLayoutIndex(schema: ItemSchema): number {
  return schema.attrs.length + textAudioAttrs(schema).length
}

export function rowLength(schema: ItemSchema): number {
  return maxLayoutIndex(schema) + (schema.hasImage ? 1 : 0)
}

export function imageLayoutIndex(schema: ItemSchema): number {
  if (!schema.hasImage) {
    return -1
  }
  return maxLayoutIndex(schema)
}

export function propTypeAt(schema: ItemSchema, layoutIndex: number): LayoutPropType {
  if (layoutIndex < 0) {
    return 'undefined'
  }
  if (layoutIndex < schema.attrs.length) {
    return 'text'
  }
  if (layoutIndex < maxLayoutIndex(schema)) {
    return 'audio'
  }
  if (schema.hasImage && layoutIndex === maxLayoutIndex(schema)) {
    return 'image'
  }
  return 'undefined'
}

export function textLayoutIndexForKey(schema: ItemSchema, key: string): number {
  return schema.attrs.findIndex((a) => a.key === key)
}

export function audioLayoutIndexForKey(schema: ItemSchema, textAudioKey: string): number {
  let audioOffset = 0
  for (const attr of schema.attrs) {
    if (attr.type !== 'text+audio') {
      continue
    }
    if (attr.key === textAudioKey) {
      return schema.attrs.length + audioOffset
    }
    audioOffset++
  }
  return -1
}

export function layoutIndexForAttrKey(
  schema: ItemSchema,
  key: string,
  slot: 'text' | 'audio' | 'image',
): number {
  if (slot === 'image') {
    return imageLayoutIndex(schema)
  }
  if (slot === 'audio') {
    return audioLayoutIndexForKey(schema, key)
  }
  return textLayoutIndexForKey(schema, key)
}

export function attrKeyAtTextLayoutIndex(schema: ItemSchema, layoutIndex: number): string | undefined {
  if (layoutIndex < 0 || layoutIndex >= schema.attrs.length) {
    return undefined
  }
  return schema.attrs[layoutIndex].key
}

/** Text columns + optional image slot (displayable on card). */
export function displayableLayoutIndexes(schema: ItemSchema): number[] {
  const out: number[] = []
  for (let i = 0; i < schema.attrs.length; i++) {
    out.push(i)
  }
  const img = imageLayoutIndex(schema)
  if (img >= 0) {
    out.push(img)
  }
  return out
}

export function audioLayoutIndexes(schema: ItemSchema): number[] {
  const out: number[] = []
  for (let i = schema.attrs.length; i < maxLayoutIndex(schema); i++) {
    out.push(i)
  }
  return out
}

export function langTypeIndex(langType?: LangType): number {
  if (langType === 'native') {
    return 1
  }
  if (langType === 'study') {
    return 2
  }
  return 0
}

export function schemaHasLangRole(schema: ItemSchema): boolean {
  return schema.attrs.some((a) => a.langType === 'native' || a.langType === 'study')
}

export type MediaSlot = {
  key: string
  kind: 'audio' | 'image'
  layoutIndex: number
  /** Parent text attr key for audio slots. */
  textKey?: string
}

export function mediaSlots(schema: ItemSchema): MediaSlot[] {
  const out: MediaSlot[] = []
  for (const attr of textAudioAttrs(schema)) {
    const layoutIndex = audioLayoutIndexForKey(schema, attr.key)
    if (layoutIndex >= 0) {
      out.push({ key: attr.key, kind: 'audio', layoutIndex, textKey: attr.key })
    }
  }
  const imgIdx = imageLayoutIndex(schema)
  if (imgIdx >= 0) {
    out.push({ key: IMAGE_MEDIA_KEY, kind: 'image', layoutIndex: imgIdx })
  }
  return out
}

export function layoutSlotLabel(schema: ItemSchema, layoutIndex: number, audioSuffix = ''): string {
  const prop = propTypeAt(schema, layoutIndex)
  if (prop === 'image') {
    return 'Image'
  }
  if (prop === 'text') {
    const attr = schema.attrs[layoutIndex]
    return attr?.key.trim() || 'Text'
  }
  if (prop === 'audio') {
    const offset = layoutIndex - schema.attrs.length
    const textAudio = textAudioAttrs(schema)[offset]
    if (textAudio?.key.trim()) {
      return audioSuffix ? `${textAudio.key.trim()} ${audioSuffix}` : textAudio.key.trim()
    }
    return audioSuffix ? `Audio ${audioSuffix}` : 'Audio'
  }
  return '?'
}

export function valueAtLayoutIndex(
  schema: ItemSchema,
  layoutIndex: number,
  values?: Record<string, string>,
): string {
  if (!values) {
    return ''
  }
  const prop = propTypeAt(schema, layoutIndex)
  if (prop === 'text') {
    const key = attrKeyAtTextLayoutIndex(schema, layoutIndex)
    return key ? (values[key] ?? '').trim() : ''
  }
  if (prop === 'image') {
    return (values[IMAGE_MEDIA_KEY] ?? '').trim()
  }
  if (prop === 'audio') {
    const offset = layoutIndex - schema.attrs.length
    const textAudio = textAudioAttrs(schema)[offset]
    return textAudio ? (values[textAudio.key] ?? '').trim() : ''
  }
  return ''
}
