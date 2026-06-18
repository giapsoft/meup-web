/** Matches meup `LabelView::tryParseBracketHighlights_`. */
export type TextHighlightSegment = {
  text: string
  highlighted: boolean
}

export type BracketHighlightParseResult = {
  displayText: string
  segments: TextHighlightSegment[]
}

const OPEN = '[['
const CLOSE = ']]'

function mergeAdjacentSegments(segments: TextHighlightSegment[]): TextHighlightSegment[] {
  if (segments.length === 0) {
    return segments
  }
  const merged: TextHighlightSegment[] = [{ ...segments[0] }]
  for (let i = 1; i < segments.length; i++) {
    const cur = segments[i]
    const last = merged[merged.length - 1]
    if (cur.highlighted === last.highlighted) {
      last.text += cur.text
    } else {
      merged.push({ ...cur })
    }
  }
  return merged
}

/**
 * Parse `[[highlighted]]` markers. Returns null when input has no valid highlight
 * pairs (including malformed or empty inner spans) — caller shows raw text.
 */
export function tryParseBracketHighlights(src: string): BracketHighlightParseResult | null {
  let cursor = 0
  const displayParts: string[] = []
  const segments: TextHighlightSegment[] = []
  let hasHighlight = false

  while (cursor < src.length) {
    const openPos = src.indexOf(OPEN, cursor)
    if (openPos === -1) {
      const tail = src.slice(cursor)
      if (tail) {
        displayParts.push(tail)
        segments.push({ text: tail, highlighted: false })
      }
      break
    }

    const innerBegin = openPos + OPEN.length
    const closePos = src.indexOf(CLOSE, innerBegin)
    if (closePos === -1 || closePos < innerBegin) {
      return null
    }

    const before = src.slice(cursor, openPos)
    if (before) {
      displayParts.push(before)
      segments.push({ text: before, highlighted: false })
    }

    const inner = src.slice(innerBegin, closePos)
    if (inner.length === 0) {
      return null
    }

    displayParts.push(inner)
    segments.push({ text: inner, highlighted: true })
    hasHighlight = true
    cursor = closePos + CLOSE.length
  }

  if (!hasHighlight) {
    return null
  }

  return {
    displayText: displayParts.join(''),
    segments: mergeAdjacentSegments(segments),
  }
}

/** Display text + segments for preview/render (falls back to plain text). */
export function parseDisplayTextWithHighlights(src: string): BracketHighlightParseResult {
  const parsed = tryParseBracketHighlights(src)
  if (parsed) {
    return parsed
  }
  return {
    displayText: src,
    segments: [{ text: src, highlighted: false }],
  }
}
