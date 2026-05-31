import { useRef, type CSSProperties } from 'react'
import type { DisplayElement, ItemSchemaAttribute, SideDraft } from '../../types/program'
import { attributeLabel, isTextAttribute, moveDisplayByPreviewDelta } from '../../utils/sideConfig'
import { displayColorOr, defaultPaletteColor } from '../../utils/colorPalette'

type SidePreviewProps = {
  side: SideDraft
  attributes: ItemSchemaAttribute[]
  selectedIndex?: number | null
  draggableIndex?: number | null
  onSelectIndex?: (index: number) => void
  onElementChange?: (index: number, element: DisplayElement) => void
  hint?: string
}

function parseBgColor(color: string): string {
  return color || defaultPaletteColor()
}

function textBgStyle(el: DisplayElement): React.CSSProperties {
  const bg = el.backgroundColor ?? ''
  const opacity = el.backgroundOpacity
  if (opacity !== undefined && opacity >= 0 && /^#[0-9a-fA-F]{6}$/.test(bg)) {
    return { backgroundColor: bg, opacity: opacity / 255 }
  }
  return { backgroundColor: bg || '#33333388' }
}

export function SidePreview({
  side,
  attributes,
  selectedIndex = null,
  draggableIndex = null,
  onSelectIndex,
  onElementChange,
  hint,
}: SidePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ index: number; pointerId: number } | null>(null)

  function handlePointerDown(index: number, e: React.PointerEvent) {
    if (draggableIndex !== index || !onElementChange) {
      onSelectIndex?.(index)
      return
    }
    dragRef.current = { index, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId || !containerRef.current || !onElementChange) {
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }
    const el = side.display[drag.index]
    if (!el) {
      return
    }
    const dx = e.movementX / rect.width
    const dy = e.movementY / rect.height
    onElementChange(drag.index, moveDisplayByPreviewDelta(el, dx, dy))
  }

  function handlePointerUp(e: React.PointerEvent) {
    const drag = dragRef.current
    if (drag && drag.pointerId === e.pointerId) {
      dragRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }
  }

  const sorted = side.display
    .map((el, index) => ({ el, index }))
    .sort((a, b) => a.el.order - b.el.order)

  return (
    <div>
      {hint && <p className="mb-2 text-xs text-text-muted">{hint}</p>}
      <div
        ref={containerRef}
        className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl border border-border shadow-lg"
        style={{
          aspectRatio: '240 / 320',
          backgroundColor: parseBgColor(side.backgroundColor),
          touchAction: draggableIndex !== null ? 'none' : 'manipulation',
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {sorted.map(({ el, index }) => {
          const isText = isTextAttribute(attributes, el.attributeIndex)
          const isSelected = selectedIndex === index
          const isDraggable = draggableIndex === index
          const label = attributeLabel(attributes, el.attributeIndex)

          return (
            <button
              key={`preview-el-${index}`}
              type="button"
              onPointerDown={(e) => handlePointerDown(index, e)}
              className={`absolute overflow-hidden border text-left transition-shadow ${
                isSelected
                  ? 'z-20 border-accent ring-2 ring-accent/40'
                  : 'z-10 border-white/20'
              } ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
              style={{
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                width: `${el.w * 100}%`,
                height: `${el.h * 100}%`,
                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
              }}
            >
              {isText ? (
                <span
                  className="flex h-full w-full items-center px-1 text-[10px] leading-tight"
                  style={{
                    color: displayColorOr(el.color, '#FFFFFF'),
                    textAlign: (el.textAlign as CSSProperties['textAlign']) || 'left',
                    justifyContent:
                      el.textAlign === 'center'
                        ? 'center'
                        : el.textAlign === 'right'
                          ? 'flex-end'
                          : 'flex-start',
                    ...textBgStyle(el),
                    borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
                  }}
                >
                  {label}
                </span>
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-black/30 text-[10px] text-white/80">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
