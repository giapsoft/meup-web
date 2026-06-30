/**
 * Side / display / playback config — ported from meup
 * `ConfigSideSchema.h`, `ConfigDisplayElement*.h`, `ConfigSideController.h`.
 */
import type { DisplayElement, ItemSchema, PlayStepDraft, SideDraft } from '../types/program'
import {
  audioLayoutIndexes,
  displayableLayoutIndexes,
  layoutSlotLabel,
  propTypeAt,
  valueAtLayoutIndex,
} from './itemSchemaLayout'
import { cyclePaletteColor, defaultPaletteColor } from './colorPalette'
import { createPlayStep } from './programConfig'

export const SCREEN_WIDTH = 240
export const SCREEN_HEIGHT = 320
export const PLAY_STEP_PAUSE_MIN = 1
export const PLAY_STEP_PAUSE_MAX = 20
export const DEFAULT_PAUSE_SECONDS = 3

const MIN_WIDTH_RATIO = 0.1
const MIN_HEIGHT_RATIO = 0.05

function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function displayableAttributeIndexes(schema: ItemSchema): number[] {
  return displayableLayoutIndexes(schema)
}

export function audioAttributeIndexes(schema: ItemSchema): number[] {
  return audioLayoutIndexes(schema)
}

export type AttributeLabelOptions = {
  /** Appended to paired text name for audio attrs, e.g. "(audio)". */
  audioSuffix?: string
  /** Shown when no display name exists — internal keys are never shown. */
  fallback?: string
}

export function attributeLabel(
  schema: ItemSchema,
  attributeIndex: number,
  options?: AttributeLabelOptions,
): string {
  const label = layoutSlotLabel(schema, attributeIndex, options?.audioSuffix?.trim() ?? '')
  if (label !== '?' && label !== 'Text' && label !== 'Audio' && label !== 'Image') {
    return label
  }
  if (options?.fallback) {
    return options.fallback
  }
  return label
}

export function displayElementPreviewText(el: DisplayElement, schema: ItemSchema): string {
  const custom = el.label?.trim()
  if (custom) {
    return custom
  }
  return attributeLabel(schema, el.attributeIndex)
}

/** Preview label from item row when editing vocabulary; falls back to wizard placeholder. */
export function displayElementContentText(
  el: DisplayElement,
  schema: ItemSchema,
  itemValues?: Record<string, string>,
): string {
  const value = valueAtLayoutIndex(schema, el.attributeIndex, itemValues)
  if (value) {
    return value
  }
  return displayElementPreviewText(el, schema)
}

export function cycleInIndexList(indexes: number[], currentIndex: number, delta: number): number {
  if (indexes.length === 0) {
    return currentIndex
  }
  const pos = indexes.indexOf(currentIndex)
  if (pos < 0) {
    return indexes[positiveMod(delta, indexes.length)]
  }
  return indexes[positiveMod(pos + delta, indexes.length)]
}

export function resolvePlayStepAttributeIndex(step: PlayStepDraft): number {
  return step.attributeIndex ?? -1
}

export function cyclePauseSeconds(currentSeconds: number, delta: number): number {
  let current = currentSeconds
  if (current < PLAY_STEP_PAUSE_MIN) {
    current = PLAY_STEP_PAUSE_MIN
  }
  if (current > PLAY_STEP_PAUSE_MAX) {
    current = PLAY_STEP_PAUSE_MAX
  }
  const span = PLAY_STEP_PAUSE_MAX - PLAY_STEP_PAUSE_MIN + 1
  const base = current - PLAY_STEP_PAUSE_MIN
  return PLAY_STEP_PAUSE_MIN + positiveMod(base + delta, span)
}

export function floorPxFromRatioX(ratio: number): number {
  return Math.floor(ratio * SCREEN_WIDTH)
}

export function floorPxFromRatioY(ratio: number): number {
  return Math.floor(ratio * SCREEN_HEIGHT)
}

function ratioFromPxX(px: number): number {
  return px / SCREEN_WIDTH
}

function ratioFromPxY(px: number): number {
  return px / SCREEN_HEIGHT
}

function minWidthPx(): number {
  return floorPxFromRatioX(MIN_WIDTH_RATIO)
}

function minHeightPx(): number {
  return floorPxFromRatioY(MIN_HEIGHT_RATIO)
}

function syncLayoutFromPx(
  el: DisplayElement,
  topPx: number,
  leftPx: number,
  widthPx: number,
  heightPx: number,
): DisplayElement {
  return {
    ...el,
    y: ratioFromPxY(topPx),
    x: ratioFromPxX(leftPx),
    w: ratioFromPxX(widthPx),
    h: ratioFromPxY(heightPx),
  }
}

function adjustBoundedPx(current: number, delta: number, minPx: number, maxPx: number): number {
  let next = current + delta
  if (next < minPx) {
    if (current <= minPx && delta < 0) {
      return maxPx
    }
    return minPx
  }
  if (next > maxPx) {
    if (current >= maxPx && delta > 0) {
      return minPx
    }
    return maxPx
  }
  return next
}

export function adjustDisplayTop(el: DisplayElement, deltaPx: number): DisplayElement {
  let top = floorPxFromRatioY(el.y)
  let height = floorPxFromRatioY(el.h)
  const left = floorPxFromRatioX(el.x)
  const width = floorPxFromRatioX(el.w)
  const minH = minHeightPx()
  if (height < minH) {
    height = minH
  }
  const maxTop = Math.max(0, SCREEN_HEIGHT - height)
  top = adjustBoundedPx(top, deltaPx, 0, maxTop)
  if (top + height > SCREEN_HEIGHT) {
    height = SCREEN_HEIGHT - top
    if (height < minH) {
      height = minH
      top = Math.max(0, SCREEN_HEIGHT - height)
    }
  }
  return syncLayoutFromPx(el, top, left, width, height)
}

export function adjustDisplayLeft(el: DisplayElement, deltaPx: number): DisplayElement {
  const top = floorPxFromRatioY(el.y)
  let left = floorPxFromRatioX(el.x)
  let width = floorPxFromRatioX(el.w)
  const height = floorPxFromRatioY(el.h)
  const minW = minWidthPx()
  if (width < minW) {
    width = minW
  }
  const maxLeft = Math.max(0, SCREEN_WIDTH - width)
  left = adjustBoundedPx(left, deltaPx, 0, maxLeft)
  if (left + width > SCREEN_WIDTH) {
    width = SCREEN_WIDTH - left
    if (width < minW) {
      width = minW
      left = Math.max(0, SCREEN_WIDTH - width)
    }
  }
  return syncLayoutFromPx(el, top, left, width, height)
}

export function adjustDisplayWidth(el: DisplayElement, deltaPx: number): DisplayElement {
  const top = floorPxFromRatioY(el.y)
  const left = floorPxFromRatioX(el.x)
  let width = floorPxFromRatioX(el.w)
  const height = floorPxFromRatioY(el.h)
  const minW = minWidthPx()
  const maxW = Math.max(minW, SCREEN_WIDTH - left)
  width = adjustBoundedPx(width, deltaPx, minW, maxW)
  if (left + width > SCREEN_WIDTH) {
    width = SCREEN_WIDTH - left
  }
  return syncLayoutFromPx(el, top, left, width, height)
}

export function adjustDisplayHeight(el: DisplayElement, deltaPx: number): DisplayElement {
  let top = floorPxFromRatioY(el.y)
  const left = floorPxFromRatioX(el.x)
  const width = floorPxFromRatioX(el.w)
  let height = floorPxFromRatioY(el.h)
  const minH = minHeightPx()
  const maxH = Math.max(minH, SCREEN_HEIGHT - top)
  height = adjustBoundedPx(height, deltaPx, minH, maxH)
  if (top + height > SCREEN_HEIGHT) {
    top = SCREEN_HEIGHT - height
    if (top < 0) {
      top = 0
      height = SCREEN_HEIGHT
    }
  }
  return syncLayoutFromPx(el, top, left, width, height)
}

export function getDisplayLayoutPx(el: DisplayElement) {
  return {
    top: floorPxFromRatioY(el.y),
    left: floorPxFromRatioX(el.x),
    width: floorPxFromRatioX(el.w),
    height: floorPxFromRatioY(el.h),
  }
}

export function displayLayoutBounds(el: DisplayElement) {
  const layout = getDisplayLayoutPx(el)
  const minW = minWidthPx()
  const minH = minHeightPx()
  return {
    ...layout,
    minW,
    minH,
    maxTop: Math.max(0, SCREEN_HEIGHT - layout.height),
    maxLeft: Math.max(0, SCREEN_WIDTH - layout.width),
    maxWidth: Math.max(minW, SCREEN_WIDTH - layout.left),
    maxHeight: Math.max(minH, SCREEN_HEIGHT - layout.top),
  }
}

export function setDisplayLayoutPx(
  el: DisplayElement,
  patch: Partial<{ top: number; left: number; width: number; height: number }>,
): DisplayElement {
  let top = patch.top ?? floorPxFromRatioY(el.y)
  let left = patch.left ?? floorPxFromRatioX(el.x)
  let width = patch.width ?? floorPxFromRatioX(el.w)
  let height = patch.height ?? floorPxFromRatioY(el.h)
  const minW = minWidthPx()
  const minH = minHeightPx()
  width = Math.max(minW, width)
  height = Math.max(minH, height)
  left = Math.max(0, Math.min(left, SCREEN_WIDTH - width))
  top = Math.max(0, Math.min(top, SCREEN_HEIGHT - height))
  width = Math.min(width, SCREEN_WIDTH - left)
  height = Math.min(height, SCREEN_HEIGHT - top)
  return syncLayoutFromPx(el, top, left, width, height)
}

export function moveDisplayByPreviewDelta(
  el: DisplayElement,
  deltaXRatio: number,
  deltaYRatio: number,
): DisplayElement {
  const layout = getDisplayLayoutPx(el)
  return setDisplayLayoutPx(el, {
    left: layout.left + Math.round(deltaXRatio * SCREEN_WIDTH),
    top: layout.top + Math.round(deltaYRatio * SCREEN_HEIGHT),
  })
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se'

export function resizeDisplayByPreviewDelta(
  el: DisplayElement,
  corner: ResizeCorner,
  deltaXRatio: number,
  deltaYRatio: number,
): DisplayElement {
  const layout = getDisplayLayoutPx(el)
  const dx = Math.round(deltaXRatio * SCREEN_WIDTH)
  const dy = Math.round(deltaYRatio * SCREEN_HEIGHT)

  switch (corner) {
    case 'se':
      return setDisplayLayoutPx(el, {
        width: layout.width + dx,
        height: layout.height + dy,
      })
    case 'sw':
      return setDisplayLayoutPx(el, {
        left: layout.left + dx,
        width: layout.width - dx,
        height: layout.height + dy,
      })
    case 'ne':
      return setDisplayLayoutPx(el, {
        top: layout.top + dy,
        width: layout.width + dx,
        height: layout.height - dy,
      })
    case 'nw':
      return setDisplayLayoutPx(el, {
        top: layout.top + dy,
        left: layout.left + dx,
        width: layout.width - dx,
        height: layout.height - dy,
      })
  }
}

export function updatePlayStep(
  side: SideDraft,
  stepIndex: number,
  patch: Partial<PlayStepDraft>,
): SideDraft {
  if (stepIndex < 0 || stepIndex >= side.playSteps.length) {
    return side
  }
  const playSteps = [...side.playSteps]
  playSteps[stepIndex] = { ...playSteps[stepIndex], ...patch }
  return { ...side, playSteps }
}

export function reorderPlaySteps(side: SideDraft, fromIndex: number, toIndex: number): SideDraft {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= side.playSteps.length ||
    toIndex >= side.playSteps.length ||
    fromIndex === toIndex
  ) {
    return side
  }
  const playSteps = [...side.playSteps]
  const [moved] = playSteps.splice(fromIndex, 1)
  playSteps.splice(toIndex, 0, moved)
  return { ...side, playSteps }
}

export function opacityToPercent(backgroundOpacity: number | undefined): number {
  if (backgroundOpacity === undefined || backgroundOpacity < 0) {
    return 0
  }
  return Math.floor((backgroundOpacity * 100 + 127) / 255)
}

/** Background layer only — opacity must not be applied to text (matches meup DisplayElementView). */
export function previewTextBackgroundStyle(el: DisplayElement): {
  backgroundColor: string
  opacity?: number
} {
  const bg = el.backgroundColor ?? ''
  let rgb = '#333333'
  let alpha = 0.53

  if (/^#[0-9a-fA-F]{6}$/i.test(bg)) {
    rgb = bg
    alpha = 1
  } else if (/^#[0-9a-fA-F]{8}$/i.test(bg)) {
    rgb = bg.slice(0, 7)
    alpha = parseInt(bg.slice(7, 9), 16) / 255
  } else if (bg) {
    rgb = bg
    alpha = 1
  }

  if (el.backgroundOpacity !== undefined && el.backgroundOpacity >= 0) {
    alpha = el.backgroundOpacity / 255
    if (/^#[0-9a-fA-F]{6}$/i.test(bg)) {
      rgb = bg
    } else if (/^#[0-9a-fA-F]{8}$/i.test(bg)) {
      rgb = bg.slice(0, 7)
    }
  }

  if (alpha <= 0) {
    return { backgroundColor: 'transparent' }
  }

  return { backgroundColor: rgb, opacity: alpha }
}

export function percentToOpacity(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent))
  return Math.floor((clamped * 255 + 50) / 100)
}

export function cycleOpacityPercent(currentPercent: number, delta: number): number {
  let step = Math.floor(currentPercent / 10)
  if (currentPercent % 10 !== 0) {
    step = Math.max(0, Math.min(10, Math.floor((currentPercent + 5) / 10)))
  }
  step = positiveMod(step + delta, 11)
  return step * 10
}

export function cycleMaxLines(current: number | undefined, delta: number): number {
  const clamped = Math.max(0, Math.min(5, current ?? 0))
  return positiveMod(clamped + delta, 6)
}

export function textAlignDisplayLabel(key: string | undefined): string {
  if (key === 'center') {
    return 'center'
  }
  if (key === 'right') {
    return 'right'
  }
  return 'left'
}

export function cycleTextAlignKey(current: string | undefined, delta: number): string {
  const keys = ['left', 'center', 'right'] as const
  let idx = 0
  if (current === 'center') {
    idx = 1
  } else if (current === 'right') {
    idx = 2
  }
  idx = positiveMod(idx + delta, 3)
  return keys[idx]
}

export function adjustBorderRadius(current: number | undefined, delta: number): number {
  return Math.max(0, Math.min(32, (current ?? 0) + delta))
}

export function isTextAttribute(schema: ItemSchema, attributeIndex: number): boolean {
  return propTypeAt(schema, attributeIndex) === 'text'
}

export function isImageAttribute(schema: ItemSchema, attributeIndex: number): boolean {
  return propTypeAt(schema, attributeIndex) === 'image'
}

export function createDefaultDisplayElement(
  schema: ItemSchema,
  existingDisplay: DisplayElement[],
): DisplayElement | null {
  const indexes = displayableAttributeIndexes(schema)
  if (indexes.length === 0) {
    return null
  }
  const used = new Set(existingDisplay.map((d) => d.attributeIndex))
  const attributeIndex = indexes.find((i) => !used.has(i)) ?? indexes[0]
  const order = existingDisplay.length

  if (propTypeAt(schema, attributeIndex) === 'image') {
    return { attributeIndex, x: 0, y: 0, w: 1, h: 1, order }
  }

  return {
    attributeIndex,
    x: 0.05,
    y: Math.min(0.1 + order * 0.22, 0.7),
    w: 0.9,
    h: 0.18,
    color: '#FFFFFF',
    backgroundColor: '#333333AA',
    order,
  }
}

export function cycleSideBackground(side: SideDraft, delta: number): SideDraft {
  const current = side.backgroundColor || defaultPaletteColor()
  return { ...side, backgroundColor: cyclePaletteColor(current, delta) }
}

export function cycleDisplayAttribute(
  side: SideDraft,
  displayIndex: number,
  schema: ItemSchema,
  delta: number,
): SideDraft {
  const indexes = displayableAttributeIndexes(schema)
  if (indexes.length === 0 || displayIndex < 0 || displayIndex >= side.display.length) {
    return side
  }
  const display = [...side.display]
  const el = display[displayIndex]
  display[displayIndex] = {
    ...el,
    attributeIndex: cycleInIndexList(indexes, el.attributeIndex, delta),
  }
  return { ...side, display }
}

export function addDisplayElement(side: SideDraft, schema: ItemSchema): SideDraft {
  const el = createDefaultDisplayElement(schema, side.display)
  if (!el) {
    return side
  }
  return { ...side, display: [...side.display, el] }
}

export function removeDisplayElement(side: SideDraft, displayIndex: number): SideDraft {
  if (displayIndex < 0 || displayIndex >= side.display.length) {
    return side
  }
  const display = side.display
    .filter((_, i) => i !== displayIndex)
    .map((d, i) => ({ ...d, order: i }))
  return { ...side, display }
}

/** Stack position 0 = back, n-1 = front — matches meup `ItemPlayer` sort by `order`. */
export function displayStackPosition(side: SideDraft, displayIndex: number): {
  position: number
  count: number
} {
  if (displayIndex < 0 || displayIndex >= side.display.length) {
    return { position: 0, count: side.display.length }
  }
  const indexed = side.display
    .map((el, i) => ({ el, i }))
    .sort((a, b) => a.el.order - b.el.order)
  const pos = indexed.findIndex((x) => x.i === displayIndex)
  return { position: pos < 0 ? 0 : pos, count: indexed.length }
}

function reorderDisplayElementInStack(
  side: SideDraft,
  displayIndex: number,
  target: 'front' | 'back',
): SideDraft {
  if (displayIndex < 0 || displayIndex >= side.display.length || side.display.length < 2) {
    return side
  }
  const indexed = side.display
    .map((el, i) => ({ el, i }))
    .sort((a, b) => a.el.order - b.el.order)
  const stackPos = indexed.findIndex((x) => x.i === displayIndex)
  if (stackPos < 0) {
    return side
  }
  if (target === 'front' && stackPos === indexed.length - 1) {
    return side
  }
  if (target === 'back' && stackPos === 0) {
    return side
  }

  const reordered = [...indexed]
  const [item] = reordered.splice(stackPos, 1)
  if (target === 'front') {
    reordered.push(item)
  } else {
    reordered.unshift(item)
  }

  const display = [...side.display]
  reordered.forEach(({ i }, order) => {
    display[i] = { ...display[i], order }
  })
  return { ...side, display }
}

export function bringDisplayElementToFront(side: SideDraft, displayIndex: number): SideDraft {
  return reorderDisplayElementInStack(side, displayIndex, 'front')
}

export function sendDisplayElementToBack(side: SideDraft, displayIndex: number): SideDraft {
  return reorderDisplayElementInStack(side, displayIndex, 'back')
}

export function updateDisplayElement(
  side: SideDraft,
  displayIndex: number,
  next: DisplayElement,
): SideDraft {
  if (displayIndex < 0 || displayIndex >= side.display.length) {
    return side
  }
  const display = [...side.display]
  display[displayIndex] = next
  return { ...side, display }
}

export function cyclePlayStep(
  side: SideDraft,
  stepIndex: number,
  schema: ItemSchema,
  delta: number,
): SideDraft {
  if (stepIndex < 0 || stepIndex >= side.playSteps.length) {
    return side
  }
  const playSteps = [...side.playSteps]
  const step = playSteps[stepIndex]
  if (step.kind === 'pause') {
    playSteps[stepIndex] = {
      ...step,
      durationSeconds: cyclePauseSeconds(step.durationSeconds ?? DEFAULT_PAUSE_SECONDS, delta),
    }
    return { ...side, playSteps }
  }
  const audioIndexes = audioAttributeIndexes(schema)
  if (audioIndexes.length === 0) {
    return side
  }
  const current = resolvePlayStepAttributeIndex(step)
  const nextIndex = cycleInIndexList(audioIndexes, current, delta)
  playSteps[stepIndex] = {
    ...step,
    attributeIndex: nextIndex,
  }
  return { ...side, playSteps }
}

export function addPlayStep(side: SideDraft, schema: ItemSchema): SideDraft {
  const audioIndexes = audioAttributeIndexes(schema)
  if (audioIndexes.length === 0) {
    return side
  }
  return {
    ...side,
    playSteps: [...side.playSteps, createPlayStep({ kind: 'play', attributeIndex: audioIndexes[0] })],
  }
}

export function addPauseStep(side: SideDraft): SideDraft {
  return {
    ...side,
    playSteps: [
      ...side.playSteps,
      createPlayStep({ kind: 'pause', durationSeconds: DEFAULT_PAUSE_SECONDS }),
    ],
  }
}

export function removePlayStep(side: SideDraft, stepIndex: number): SideDraft {
  if (stepIndex < 0 || stepIndex >= side.playSteps.length) {
    return side
  }
  return { ...side, playSteps: side.playSteps.filter((_, i) => i !== stepIndex) }
}

export function playStepLabel(
  step: PlayStepDraft,
  schema: ItemSchema,
  tPlay: (name: string) => string,
  tPause: (seconds: number) => string,
): string {
  if (step.kind === 'pause') {
    return tPause(step.durationSeconds ?? DEFAULT_PAUSE_SECONDS)
  }
  const idx = resolvePlayStepAttributeIndex(step)
  const name = attributeLabel(schema, idx)
  return tPlay(name)
}
