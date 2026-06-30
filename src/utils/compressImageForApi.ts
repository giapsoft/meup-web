export type CompressedImage = {
  /** Raw base64 without data-URL prefix (matches meup-api `stripBase64DataURL`). */
  base64: string
  mimeType: 'image/jpeg'
  originalBytes: number
  compressedBytes: number
  width: number
  height: number
}

export type CompressImageOptions = {
  /** Longest side in pixels after resize. */
  maxLongEdge?: number
  /** Target upper bound for compressed binary size. */
  targetMaxBytes?: number
  /** Initial JPEG quality (0–1). */
  initialQuality?: number
  /** Lowest JPEG quality to try before shrinking dimensions further. */
  minQuality?: number
}

const DEFAULT_MAX_LONG_EDGE = 1280
const DEFAULT_TARGET_MAX_BYTES = 1.5 * 1024 * 1024
const DEFAULT_INITIAL_QUALITY = 0.82
const DEFAULT_MIN_QUALITY = 0.45

const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_MIME.has(file.type)
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image_load_failed'))
    }
    img.src = url
  })
}

function scaledDimensions(
  width: number,
  height: number,
  maxLongEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) {
    return { width, height }
  }
  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('canvas_encode_failed'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('read_failed'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(blob)
  })
}

async function encodeCanvasUnderBudget(
  canvas: HTMLCanvasElement,
  targetMaxBytes: number,
  initialQuality: number,
  minQuality: number,
): Promise<Blob> {
  let quality = initialQuality
  let blob = await canvasToJpegBlob(canvas, quality)
  while (blob.size > targetMaxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.08)
    blob = await canvasToJpegBlob(canvas, quality)
  }
  return blob
}

/**
 * Resize + JPEG compress for product-create `fromImage` job payload.
 * Vision on API currently labels mime as png; JPEG bytes are still used for smaller wire size.
 */
export async function compressImageFile(
  file: File,
  opts: CompressImageOptions = {},
): Promise<CompressedImage> {
  if (!isAcceptedImageFile(file)) {
    throw new Error('unsupported_image_type')
  }

  const maxLongEdge = opts.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE
  const targetMaxBytes = opts.targetMaxBytes ?? DEFAULT_TARGET_MAX_BYTES
  const initialQuality = opts.initialQuality ?? DEFAULT_INITIAL_QUALITY
  const minQuality = opts.minQuality ?? DEFAULT_MIN_QUALITY

  const img = await loadImageFromFile(file)
  let longEdge = maxLongEdge
  let blob: Blob | null = null
  let outWidth = 0
  let outHeight = 0

  while (longEdge >= 480) {
    const dims = scaledDimensions(img.naturalWidth, img.naturalHeight, longEdge)
    outWidth = dims.width
    outHeight = dims.height

    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('canvas_context_failed')
    }
    ctx.drawImage(img, 0, 0, outWidth, outHeight)

    blob = await encodeCanvasUnderBudget(canvas, targetMaxBytes, initialQuality, minQuality)
    if (blob.size <= targetMaxBytes) {
      break
    }
    longEdge = Math.round(longEdge * 0.75)
  }

  if (!blob) {
    throw new Error('compress_failed')
  }

  const base64 = await blobToBase64(blob)
  return {
    base64,
    mimeType: 'image/jpeg',
    originalBytes: file.size,
    compressedBytes: blob.size,
    width: outWidth,
    height: outHeight,
  }
}

/** Data URL for UI preview. */
export function compressedImagePreviewUrl(base64: string, mimeType = 'image/jpeg'): string {
  return `data:${mimeType};base64,${base64}`
}
