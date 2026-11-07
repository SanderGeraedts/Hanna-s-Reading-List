import type { Book } from './library'

/**
 * The scenes a book nook can show (#17). Every group gets a scene that fits
 * its books (by their main genre), and its own variation of it (colours,
 * which windows are lit, stars), so no two nooks look the same.
 */
export type NookThemeId =
  | 'alley'
  | 'forest'
  | 'seaside'
  | 'castle'
  | 'winter'
  | 'neon'
  | 'library'
  | 'meadow'
  | 'space'
  | 'aurora'

export interface NookTheme {
  id: NookThemeId
  /** the box the scene is built in */
  shell: string
  walls: 'houses' | 'trees' | 'huts' | 'stone' | 'neon' | 'shelves'
  /** colours for the left and the right side */
  palettes: [string[], string[]]
  sky: 'night' | 'sunset' | 'day' | 'dusk' | 'space' | 'aurora' | 'rain'
  ground: 'cobbles' | 'grass' | 'sand' | 'snow' | 'wet' | 'boards'
  /** colour of the light from windows, torches and lamps */
  glow: string
  /** bulbs strung across the scene, or none */
  lights: string[] | null
  lamp: boolean
  /** snow on the roofs */
  snowy?: boolean
}

export const NOOK_THEMES: Record<NookThemeId, NookTheme> = {
  alley: {
    id: 'alley',
    shell: '#2d4440',
    walls: 'houses',
    palettes: [
      ['#c98f5a', '#d8b48a', '#a86a52'],
      ['#b87a8a', '#d6c08f', '#8f9fb0'],
    ],
    sky: 'night',
    ground: 'cobbles',
    glow: '#ffc46b',
    lights: ['#ffd27a', '#ffb86b', '#fff0c2'],
    lamp: true,
  },
  forest: {
    id: 'forest',
    shell: '#2f3d27',
    walls: 'trees',
    palettes: [
      ['#3f6b3a', '#2f5a3f', '#5a7d3a'],
      ['#36603f', '#4d7a43', '#2c4f36'],
    ],
    sky: 'dusk',
    ground: 'grass',
    glow: '#d9ff8a',
    lights: ['#e8ff9a', '#c6ff7a', '#fff6b0'],
    lamp: false,
  },
  seaside: {
    id: 'seaside',
    shell: '#3d6f8a',
    walls: 'huts',
    palettes: [
      ['#f3a6a0', '#9fd3e6', '#f6e1a1'],
      ['#b8e0c2', '#f7c59f', '#c8b6e2'],
    ],
    sky: 'sunset',
    ground: 'sand',
    glow: '#ffd59a',
    lights: ['#ffe0a3', '#ffc48a', '#fff3d0'],
    lamp: false,
  },
  castle: {
    id: 'castle',
    shell: '#3b3532',
    walls: 'stone',
    palettes: [
      ['#8a8378', '#9a9284', '#7a7469'],
      ['#857e74', '#958c80', '#736d64'],
    ],
    sky: 'night',
    ground: 'cobbles',
    glow: '#ff9b45',
    lights: null,
    lamp: false,
  },
  winter: {
    id: 'winter',
    shell: '#2a3b55',
    walls: 'houses',
    palettes: [
      ['#a8473f', '#c9a36b', '#6f8aa6'],
      ['#4f7a5a', '#c47a4a', '#b9b2a0'],
    ],
    sky: 'night',
    ground: 'snow',
    glow: '#ffd28a',
    lights: ['#ff6b6b', '#ffd36b', '#6bd3ff', '#9bff8a'],
    lamp: true,
    snowy: true,
  },
  neon: {
    id: 'neon',
    shell: '#1f2333',
    walls: 'neon',
    palettes: [
      ['#ff4fa3', '#45e0ff', '#ffd24a'],
      ['#a66bff', '#45ffb0', '#ff6b4a'],
    ],
    sky: 'rain',
    ground: 'wet',
    glow: '#ff7ac8',
    lights: null,
    lamp: true,
  },
  library: {
    id: 'library',
    shell: '#4a2f22',
    walls: 'shelves',
    palettes: [
      ['#8c2f39', '#2f5d8c', '#3f7a4a', '#c9a24a', '#6b3f8c'],
      ['#a8553a', '#2f4f6b', '#7a7a3a', '#8c2f5d', '#3a6b6b'],
    ],
    sky: 'dusk',
    ground: 'boards',
    glow: '#ffcf7a',
    lights: ['#ffe2a0', '#ffd27a', '#fff0c2'],
    lamp: true,
  },
  meadow: {
    id: 'meadow',
    shell: '#5a7d4a',
    walls: 'houses',
    palettes: [
      ['#f2d7a6', '#f5b8b0', '#bfe0f0'],
      ['#f7e3a3', '#c9e8c0', '#e8c6e8'],
    ],
    sky: 'day',
    ground: 'grass',
    glow: '#fff4cc',
    lights: null,
    lamp: false,
  },
  space: {
    id: 'space',
    shell: '#1f1b3a',
    walls: 'stone',
    palettes: [
      ['#4a4570', '#5a5285', '#3d3860'],
      ['#463f6e', '#57508a', '#3a3462'],
    ],
    sky: 'space',
    ground: 'sand',
    glow: '#7af0ff',
    lights: ['#7af0ff', '#b48aff', '#7affc4'],
    lamp: false,
  },
  aurora: {
    id: 'aurora',
    shell: '#22343f',
    walls: 'houses',
    palettes: [
      ['#3f5a6b', '#6b4a3f', '#4a5a3f'],
      ['#5a3f4a', '#3f4a6b', '#6b5a3f'],
    ],
    sky: 'aurora',
    ground: 'snow',
    glow: '#ffd28a',
    lights: null,
    lamp: true,
    snowy: true,
  },
}

/** Which scene fits a genre. */
const GENRE_THEME: Record<string, NookThemeId> = {
  Fantasy: 'forest',
  Mythology: 'castle',
  'Historical fiction': 'castle',
  Horror: 'castle',
  Classics: 'library',
  Poetry: 'library',
  Biography: 'library',
  'Non-fiction': 'library',
  Romance: 'seaside',
  'Self-help': 'seaside',
  'Science fiction': 'space',
  Dystopian: 'neon',
  Thriller: 'neon',
  Crime: 'neon',
  'Graphic novel': 'neon',
  Mystery: 'alley',
  'Young adult': 'alley',
  Adventure: 'aurora',
  "Children's": 'meadow',
  Humour: 'meadow',
}

const ALL: NookThemeId[] = Object.keys(NOOK_THEMES) as NookThemeId[]

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The genre most of the books share (first-listed genres count double). */
export function mainGenre(books: Book[]): string | undefined {
  const count = new Map<string, number>()
  for (const b of books) {
    ;(b.genres ?? []).forEach((g, i) => count.set(g, (count.get(g) ?? 0) + (i === 0 ? 2 : 1)))
  }
  let best: string | undefined
  let n = 0
  for (const [g, c] of count) if (c > n) [best, n] = [g, c]
  return best
}

/**
 * The scene for a group: the one that fits its main genre (or the genre
 * itself, when grouped by genre), otherwise one picked by the group's name.
 * `variant` gives each group its own version of the scene.
 */
export function themeFor(label: string, books: Book[], genre?: string): { theme: NookThemeId; variant: number } {
  const variant = hash(label) % 1000
  const g = genre ?? mainGenre(books)
  const fit = g ? GENRE_THEME[g] : undefined
  return { theme: fit ?? ALL[hash(`theme:${label}`) % ALL.length], variant }
}
