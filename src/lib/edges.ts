import type { Book } from './library'

/**
 * Coloured and patterned page edges (#98), like the sprayed edges of special
 * editions: often themed on the book, in colours from its cover. Each book
 * may have its own; without, the pages are plain paper.
 */

export const EDGE_PATTERNS = {
  sprayed: 'Sprayed (one colour)',
  gradient: 'Fade',
  stripes: 'Stripes',
  dots: 'Dots',
  stars: 'Stars',
  hearts: 'Hearts',
  flowers: 'Flowers',
  leaves: 'Leaves',
  moons: 'Moons',
  waves: 'Waves',
  diamonds: 'Diamonds',
  marble: 'Marble',
} as const

export type EdgePattern = keyof typeof EDGE_PATTERNS

export interface PageEdges {
  pattern: EdgePattern
  /** the base colour, the pattern's colour, and an optional third */
  colors: [string, string] | [string, string, string]
}

const HEX = /^#[0-9a-f]{6}$/i
const isPattern = (p: unknown): p is EdgePattern => typeof p === 'string' && Object.hasOwn(EDGE_PATTERNS, p)

/** Page edges made safe: undefined when not usable. */
export function cleanEdges(raw: unknown): PageEdges | undefined {
  const r = raw as Partial<PageEdges> | null
  if (!r || typeof r !== 'object' || !isPattern(r.pattern)) return undefined
  const colors = (Array.isArray(r.colors) ? r.colors : [])
    .filter((c): c is string => typeof c === 'string' && HEX.test(c))
    .map((c) => c.toLowerCase())
    .slice(0, 3)
  if (colors.length === 0) return undefined
  if (colors.length === 1) colors.push(colors[0])
  return { pattern: r.pattern, colors: colors as PageEdges['colors'] }
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`

/** Lighter (amount > 0) or darker (< 0). */
export function shadeHex(hex: string, amount: number) {
  const [r, g, b] = parseHex(hex)
  const f = (v: number) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))
  return toHex(f(r), f(g), f(b))
}

const luminance = (hex: string) => {
  const [r, g, b] = parseHex(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/**
 * Edges themed on the cover: its main colour sprayed on, with a lighter or
 * darker touch of it, or gold on a dark cover.
 */
export function edgesFromCover(book: Pick<Book, 'color'>): PageEdges {
  const base = HEX.test(book.color) ? book.color.toLowerCase() : '#8a6d4b'
  const dark = luminance(base) < 0.35
  return { pattern: 'sprayed', colors: [base, dark ? '#d8b25a' : shadeHex(base, -0.35)] }
}
