/** Ported from meup `ColorPalette.h`. */
export const COLOR_PALETTE = [
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#1b4332',
  '#2d6a4f',
  '#14532d',
  '#7f1d1d',
  '#581c87',
  '#1e293b',
  '#374151',
  '#422006',
  '#111827',
  '#0c4a6e',
  '#312e81',
  '#FFFFFF',
  '#F3F4F6',
  '#E5E7EB',
  '#D1D5DB',
  '#9CA3AF',
  '#CCCCCC',
  '#FDE047',
  '#FBBF24',
  '#F59E0B',
  '#FB923C',
  '#F97316',
  '#FCA5A5',
  '#F87171',
  '#FB7185',
  '#F472B6',
  '#C4B5FD',
  '#A78BFA',
  '#818CF8',
  '#93C5FD',
  '#67E8F9',
  '#86EFAC',
  '#4ADE80',
  '#2DD4BF',
] as const

function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function colorPaletteIndexOf(color: string, fallbackIndex = 0): number {
  const idx = COLOR_PALETTE.indexOf(color as (typeof COLOR_PALETTE)[number])
  return idx >= 0 ? idx : fallbackIndex
}

export function cyclePaletteColor(current: string, delta: number): string {
  const n = COLOR_PALETTE.length
  let idx = colorPaletteIndexOf(current, 0)
  idx = positiveMod(idx + delta, n)
  return COLOR_PALETTE[idx]
}

export function defaultPaletteColor(): string {
  return COLOR_PALETTE[0]
}

export function displayColorOr(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback
}
