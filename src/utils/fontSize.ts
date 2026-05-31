/** Matches tach `FontSize.h` / capygo-api dense CFNT sizes (px). */
export const FONT_SIZES_PX = [12, 14, 18, 24, 32, 48] as const

/** Largest first — same order as `FontSize::allDecrease`. */
export const FONT_SIZES_ALL_DECREASE = [48, 32, 24, 18, 14, 12] as const

export const FONT_SIZE_NORMAL = 14

const PREVIEW_FONT = 'Segoe UI, system-ui, -apple-system, sans-serif'

function lineHeightPx(fontPx: number): number {
  return Math.ceil(fontPx * 1.2)
}

function boundedHeightPx(
  boxHeightPx: number,
  maxLines: number | undefined,
  fontPx: number,
): number {
  if (maxLines !== undefined && maxLines > 0) {
    const lh = lineHeightPx(fontPx)
    const fromLines = maxLines * lh
    return Math.min(boxHeightPx, fromLines)
  }
  return boxHeightPx
}

let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (measureCtx) {
    return measureCtx
  }
  if (typeof document === 'undefined') {
    return null
  }
  const canvas = document.createElement('canvas')
  measureCtx = canvas.getContext('2d')
  return measureCtx
}

/** Word-wrap measure — approximates LVGL `lv_txt_get_size` + BREAK mode. */
function measureWrappedText(
  text: string,
  fontPx: number,
  maxWidthPx: number,
): { width: number; height: number } {
  const ctx = getMeasureCtx()
  const lh = lineHeightPx(fontPx)
  if (!ctx || maxWidthPx <= 0) {
    return { width: 0, height: lh }
  }

  ctx.font = `${fontPx}px ${PREVIEW_FONT}`
  const content = text.trim() || ' '
  const words = content.split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return { width: 0, height: lh }
  }

  let line = ''
  let maxLineW = 0
  let lines = 1

  for (const word of words) {
    const trial = line ? `${line} ${word}` : word
    const trialW = ctx.measureText(trial).width
    if (trialW > maxWidthPx && line) {
      maxLineW = Math.max(maxLineW, ctx.measureText(line).width)
      line = word
      lines++
    } else {
      line = trial
      maxLineW = Math.max(maxLineW, trialW)
    }
  }

  return { width: maxLineW, height: lines * lh }
}

/**
 * Pick the largest dense font size that fits the box — mirrors tach
 * `LabelView::resolveFontSizePx_`.
 */
export function resolvePreviewFontSizePx(
  text: string,
  widthPx: number,
  heightPx: number,
  maxLines?: number,
): number {
  if (widthPx <= 0 || heightPx <= 0) {
    return FONT_SIZE_NORMAL
  }

  const measuredText = text.trim() || ' '

  for (const px of FONT_SIZES_ALL_DECREASE) {
    const maxH = boundedHeightPx(heightPx, maxLines, px)
    if (maxH <= 0) {
      continue
    }
    const size = measureWrappedText(measuredText, px, widthPx)
    if (size.width <= widthPx && size.height <= maxH) {
      return px
    }
  }

  return FONT_SIZES_PX[0]
}

/** Scale device px font to rendered preview container width. */
export function scaleFontSizeForPreview(fontPx: number, previewWidthPx: number, screenWidth: number): number {
  if (screenWidth <= 0 || previewWidthPx <= 0) {
    return fontPx
  }
  return fontPx * (previewWidthPx / screenWidth)
}
