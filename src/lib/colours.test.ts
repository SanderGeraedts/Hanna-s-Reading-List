import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The colour check: every text colour in the design system against what it
 * sits on, by the WCAG contrast ratio (4.5 for text, 3 for big numbers and
 * outlines). The colours are read from the top of styles.css, so a change
 * there that makes something hard to read fails here.
 */

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))
const token = (name: string): string => {
  const m = root.match(new RegExp(`--${name}:\s*([^;]+);`))
  if (!m) throw new Error(`--${name} is not defined`)
  return m[1].trim()
}

type RGBA = [number, number, number, number]
function parse(colour: string): RGBA {
  const v = colour.trim()
  if (v.startsWith('var(')) return parse(token(v.slice(6, -1)))
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  const m = v.match(/rgba?\(([^)]+)\)/)
  if (!m) throw new Error(`can't read ${colour}`)
  const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim())
  return [Number(r), Number(g), Number(b), Number(a)]
}
/** A see-through colour over a solid one. */
const over = (top: RGBA, under: RGBA): RGBA => [
  top[0] * top[3] + under[0] * (1 - top[3]),
  top[1] * top[3] + under[1] * (1 - top[3]),
  top[2] * top[3] + under[2] * (1 - top[3]),
  1,
]
const luminance = ([r, g, b]: RGBA) => {
  const ch = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}
const contrast = (a: RGBA, b: RGBA) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const c = (name: string) => parse(token(name))

// the midnight wallpaper (Make the room yours): its own wallpaper tokens over the :root ones
const midStart = css.indexOf("html[data-wallpaper='midnight'] {")
const midnight = css.slice(midStart, css.indexOf('}', midStart))
const mid = (name: string): RGBA => {
  const m = midnight.match(new RegExp(`--${name}:\\s*([^;]+);`))
  return m ? parse(m[1]) : c(name)
}

// the backgrounds: the wallpaper from top to bottom, and a card on it
const walls = ['wall-top', 'wall-page-bottom'].map(c)
const cardsOnWall = walls.map((w) => over(c('surface'), w))

describe('colour check: everything stays readable', () => {
  const cases: Array<[string, RGBA, RGBA[], number]> = [
    ['text on a card', c('text'), cardsOnWall, 4.5],
    ['helper text on a card', c('muted'), cardsOnWall, 4.5],
    ['gold on a card (titles, ticks)', c('accent'), cardsOnWall, 3],
    ['warning on a card', c('warning'), cardsOnWall, 4.5],
    ['danger on a card', c('danger'), cardsOnWall, 4.5],
    ['text on a gold button', c('accent-ink'), [c('accent')], 4.5],
    ['header text on the wallpaper', c('header-ink'), walls, 4.5],
    // a chosen format chip: a gold wash over a card
    ['text on a gold wash over a card', c('text'), cardsOnWall.map((card) => over(c('accent-soft'), card)), 4.5],
    // the buying jar below zero: "🪙 −1.4 coins" in the sunken well over a card (T-0016)
    ['warning on a sunken well over a card', c('warning'), cardsOnWall.map((card) => over(c('surface-sunken'), card)), 4.5],
    ['header helper text on the wallpaper', c('header-muted'), walls, 4.5],
  ]
  // on the midnight wallpaper: the text straight on it, and the cards on it
  const midWalls = ['wall-top', 'wall-page-bottom'].map(mid)
  const midCards = midWalls.map((w) => over(c('surface'), w))
  cases.push(
    ['header text on the midnight wallpaper', mid('header-ink'), midWalls, 4.5],
    ['header helper text on the midnight wallpaper', mid('header-muted'), midWalls, 4.5],
    ['text on a card on the midnight wallpaper', c('text'), midCards, 4.5],
    ['helper text on a card on the midnight wallpaper', c('muted'), midCards, 4.5],
    ['gold on a card on the midnight wallpaper', c('accent'), midCards, 3],
    ['text on a gold wash over a card on the midnight wallpaper', c('text'), midCards.map((card) => over(c('accent-soft'), card)), 4.5],
    ['warning on a sunken well over a card on the midnight wallpaper', c('warning'), midCards.map((card) => over(c('surface-sunken'), card)), 4.5],
    // the white round buttons in the header keep dark text on both wallpapers
    ['text on a header button (lavender)', c('pill-ink'), walls.map((w) => over([255, 255, 255, 0.72], w)), 4.5],
    ['text on a header button (midnight)', c('pill-ink'), midWalls.map((w) => over([255, 255, 255, 0.72], w)), 4.5],
    // the header text over the header's haze, on the midnight wallpaper
    ['header text over the midnight haze', mid('header-ink'), midWalls.map((w) => over([30, 40, 88, 0.92], w)), 4.5],
  )
  it('reads the midnight wallpaper’s own colours', () => {
    expect(midStart).toBeGreaterThan(0)
    expect(mid('header-ink')).not.toEqual(c('header-ink'))
    expect(mid('wall-top')).not.toEqual(c('wall-top'))
  })
  for (const [what, fg, bgs, min] of cases) {
    it(`${what} (at least ${min}:1)`, () => {
      for (const bg of bgs) expect(Math.round(contrast(fg, bg) * 100) / 100).toBeGreaterThanOrEqual(min)
    })
  }
})
