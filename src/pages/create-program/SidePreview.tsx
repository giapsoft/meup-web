import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { DisplayElement, ItemSchema, SideDraft } from '../../types/program'
import { IMAGE_MEDIA_KEY } from '../../types/program'
import {
  resolvePreviewFontSizePx,
  scaleFontSizeForPreview,
} from '../../utils/fontSize'
import { parseDisplayTextWithHighlights } from '../../utils/textHighlight'
import {
  attributeLabel,
  displayElementContentText,
  isImageAttribute,
  isTextAttribute,
  moveDisplayByPreviewDelta,
  previewTextBackgroundStyle,
  resizeDisplayByPreviewDelta,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  type ResizeCorner,
} from '../../utils/sideConfig'
import { displayColorOr, defaultPaletteColor } from '../../utils/colorPalette'

type SidePreviewProps = {
  side: SideDraft
  schema: ItemSchema
  selectedIndex?: number | null
  draggableIndex?: number | null
  onSelectIndex?: (index: number) => void
  onElementChange?: (index: number, element: DisplayElement) => void
  hint?: string
  /** Live vocabulary row — overrides wizard placeholder text. */
  itemValues?: Record<string, string>
  /** Object URLs for staged image/audio files keyed by attribute key. */
  itemMediaUrls?: Record<string, string>
  readOnly?: boolean
}

type PointerInteraction = {
  index: number
  pointerId: number
  moved: boolean
  mode: 'move' | 'resize'
  corner?: ResizeCorner
}

const RESIZE_CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se']

const CORNER_CLASS: Record<ResizeCorner, string> = {
  nw: '-left-2 -top-2 cursor-nwse-resize',
  ne: '-right-2 -top-2 cursor-nesw-resize',
  sw: '-bottom-2 -left-2 cursor-nesw-resize',
  se: '-bottom-2 -right-2 cursor-nwse-resize',
}

function parseBgColor(color: string): string {
  return color || defaultPaletteColor()
}

function ResizeHandle({
  corner,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  corner: ResizeCorner
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}) {
  return (
    <span
      role="presentation"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent bg-surface shadow ${CORNER_CLASS[corner]}`}
      style={{ touchAction: 'none' }}
    >
      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
    </span>
  )
}

export function SidePreview({
  side,
  schema,
  selectedIndex = null,
  draggableIndex = null,
  onSelectIndex,
  onElementChange,
  hint,
  itemValues,
  itemMediaUrls,
  readOnly = false,
}: SidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef<PointerInteraction | null>(null)
  const [previewWidth, setPreviewWidth] = useState(SCREEN_WIDTH)

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width
      if (w > 0) {
        setPreviewWidth(w)
      }
    })
    observer.observe(node)
    setPreviewWidth(node.getBoundingClientRect().width || SCREEN_WIDTH)
    return () => observer.disconnect()
  }, [])

  function selectIndex(index: number) {
    if (index !== selectedIndex) {
      onSelectIndex?.(index)
    }
  }

  function applyPointerDelta(e: React.PointerEvent) {
    const active = pointerRef.current
    if (!active || active.pointerId !== e.pointerId || !containerRef.current || !onElementChange) {
      return
    }
    if (Math.abs(e.movementX) > 1 || Math.abs(e.movementY) > 1) {
      active.moved = true
    }
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }
    const el = side.display[active.index]
    if (!el) {
      return
    }
    const dx = e.movementX / rect.width
    const dy = e.movementY / rect.height
    const lockSquare = isImageAttribute(schema, el.attributeIndex)
    if (active.mode === 'resize' && active.corner) {
      onElementChange(
        active.index,
        resizeDisplayByPreviewDelta(el, active.corner, dx, dy, { lockSquare }),
      )
      return
    }
    onElementChange(active.index, moveDisplayByPreviewDelta(el, dx, dy, { lockSquare }))
  }

  function endPointer(index: number, e: React.PointerEvent) {
    const active = pointerRef.current
    if (!active || active.pointerId !== e.pointerId) {
      return
    }
    if (!active.moved && active.mode === 'move') {
      selectIndex(index)
    }
    pointerRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  function startMove(index: number, e: React.PointerEvent) {
    if (draggableIndex !== index || !onElementChange) {
      selectIndex(index)
      return
    }
    pointerRef.current = { index, pointerId: e.pointerId, moved: false, mode: 'move' }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function startResize(index: number, corner: ResizeCorner, e: React.PointerEvent) {
    e.stopPropagation()
    if (draggableIndex !== index || !onElementChange) {
      return
    }
    pointerRef.current = {
      index,
      pointerId: e.pointerId,
      moved: false,
      mode: 'resize',
      corner,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const sorted = side.display
    .map((el, index) => ({ el, index }))
    .sort((a, b) => a.el.order - b.el.order)

  const pointerHandlers = (index: number, corner?: ResizeCorner) => ({
    onPointerMove: applyPointerDelta,
    onPointerUp: (e: React.PointerEvent) => endPointer(index, e),
    onPointerCancel: (e: React.PointerEvent) => endPointer(index, e),
    onPointerDown: corner
      ? (e: React.PointerEvent) => startResize(index, corner, e)
      : (e: React.PointerEvent) => startMove(index, e),
  })

  return (
    <div>
      {hint && <p className="mb-2 text-xs text-text-muted">{hint}</p>}
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-[240px] overflow-hidden border border-border shadow-lg sm:max-w-[260px] lg:max-w-[280px] xl:max-w-[320px]"
        style={{
          aspectRatio: '240 / 320',
          backgroundColor: parseBgColor(side.backgroundColor),
          touchAction: 'manipulation',
        }}
      >
        {sorted.map(({ el, index }, stackIndex) => {
          const isText = isTextAttribute(schema, el.attributeIndex)
          const isImage = isImageAttribute(schema, el.attributeIndex)
          const isSelected = selectedIndex === index
          const isEditable = !readOnly && draggableIndex === index
          const label = isText
            ? displayElementContentText(el, schema, itemValues)
            : attributeLabel(schema, el.attributeIndex)
          const imageUrl = isImage ? itemMediaUrls?.[IMAGE_MEDIA_KEY] : undefined
          const bodyHandlers = pointerHandlers(index)

          return (
            <div
              key={`preview-el-${index}`}
              className={`absolute ${
                isSelected ? 'border-accent ring-2 ring-accent/40' : 'border-white/20'
              } ${isEditable ? '' : 'cursor-pointer'} border`}
              style={{
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                width: `${el.w * 100}%`,
                height: `${el.h * 100}%`,
                zIndex: stackIndex + 1,
                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                {...bodyHandlers}
                className={`h-full w-full overflow-hidden text-left ${
                  isEditable ? 'cursor-grab touch-none active:cursor-grabbing' : ''
                }`}
                style={{ touchAction: isEditable ? 'none' : 'manipulation' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectIndex(index)
                  }
                }}
              >
                {isText ? (() => {
                  const parsed = parseDisplayTextWithHighlights(label)
                  const { displayText, segments } = parsed
                  const boxW = Math.max(1, Math.round(el.w * SCREEN_WIDTH))
                  const boxH = Math.max(1, Math.round(el.h * SCREEN_HEIGHT))
                  const maxLines = el.maxLines && el.maxLines > 0 ? el.maxLines : undefined
                  const fontPx = resolvePreviewFontSizePx(displayText, boxW, boxH, maxLines)
                  const scaledFontPx = scaleFontSizeForPreview(
                    fontPx,
                    previewWidth,
                    SCREEN_WIDTH,
                  )
                  const scaledLineHeight = scaledFontPx * 1.2
                  const baseColor = displayColorOr(el.color, '#FFFFFF')
                  const highlightColor = el.outstandingColor
                    ? displayColorOr(el.outstandingColor, baseColor)
                    : baseColor

                  return (
                    <span
                      className="relative flex h-full w-full items-center"
                      style={{
                        borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                      }}
                    >
                      <span
                        className="pointer-events-none absolute inset-0"
                        style={{
                          ...previewTextBackgroundStyle(el),
                          borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                        }}
                      />
                      <span
                        className="pointer-events-none relative z-[1] w-full overflow-hidden break-words"
                        style={{
                          color: baseColor,
                          fontSize: `${scaledFontPx}px`,
                          lineHeight: `${scaledLineHeight}px`,
                          textAlign: (el.textAlign as CSSProperties['textAlign']) || 'left',
                          ...(maxLines
                            ? { maxHeight: `${maxLines * scaledLineHeight}px` }
                            : {}),
                        }}
                      >
                        {segments.map((segment, segmentIndex) => (
                          <span
                            key={`seg-${segmentIndex}`}
                            style={{
                              color:
                                segment.highlighted && el.outstandingColor
                                  ? highlightColor
                                  : undefined,
                            }}
                          >
                            {segment.text}
                          </span>
                        ))}
                      </span>
                    </span>
                  )
                })() : isImage ? (
                  imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="pointer-events-none h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <span className="pointer-events-none flex h-full w-full items-center justify-center border border-dashed border-text-muted/40 bg-transparent text-xs text-text-muted">
                      {label}
                    </span>
                  )
                ) : (
                  <span className="pointer-events-none flex h-full w-full items-center justify-center bg-surface-card text-xs text-text-muted">
                    {label}
                  </span>
                )}
              </div>

              {isEditable &&
                isSelected &&
                RESIZE_CORNERS.map((corner) => (
                  <ResizeHandle
                    key={corner}
                    corner={corner}
                    {...pointerHandlers(index, corner)}
                  />
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
