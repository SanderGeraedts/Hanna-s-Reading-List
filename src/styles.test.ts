import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The header over the pages (T-0035): read straight from styles.css, like the colour check.
 * The band's colours are checked in src/lib/colours.test.ts; this checks the rules are there.
 */

const css = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8').replace(/\r\n/g, '\n')
/** The body of a rule, by its exact selector at the start of a line. */
const rule = (selector: string): string => {
  const at = css.indexOf(`\n${selector} {`)
  if (at < 0) throw new Error(`no rule for ${selector}`)
  return css.slice(at, css.indexOf('\n}', at))
}
const prop = (body: string, name: string) => body.match(new RegExp(`\\n\\s*${name}:\\s*([^;]+);`))?.[1].trim()

describe('the header over the pages (T-0035)', () => {
  it('the pages scroll what is focused or scrolled to below the header (scroll-padding-top from --header-h)', () => {
    const padding = prop(rule('.dashboard'), 'scroll-padding-top')
    expect(padding).toBeDefined()
    expect(padding).toContain('var(--header-h')
  })

  it('while arranging, the scroll padding adds the Arrange bar’s measured height', () => {
    const padding = prop(rule('.dashboard:has(.dashboard-bar.arranging)'), 'scroll-padding-top')
    expect(padding).toContain('var(--header-h')
    expect(padding).toContain('var(--arrange-h')
  })

  it('on the pages the header has a solid band in its own colour, with a soft fade under it', () => {
    const band = rule('.topbar.on-page')
    expect(prop(band, 'background')).toContain('--header-fade')
    // one colour over the whole height, not a gradient like the haze (any see-through comes from a
    // token and is checked by colours.test.ts)
    expect(prop(band, 'background')).not.toContain('gradient')
    expect(prop(rule('.topbar.on-page::after'), 'background')).toContain('--header-fade')
  })

  it('the band changes the background only, not the header’s size', () => {
    const band = rule('.topbar.on-page')
    for (const p of ['padding', 'height', 'min-height', 'margin', 'border', 'gap', 'font-size']) expect(prop(band, p)).toBeUndefined()
    // the fade hangs below the header, out of the layout
    expect(prop(rule('.topbar.on-page::after'), 'position')).toBe('absolute')
  })

  it('the scroll padding stays in step with where the first card starts, also while arranging (tester)', () => {
    const dash = rule('.dashboard')
    const padding = prop(dash, 'scroll-padding-top')!
    // .dashboard's padding-top (#181) is the same sum: a focused element stops where the first card starts
    expect(prop(dash, 'padding')!.startsWith(padding)).toBe(true)
    // the arranging rule repeats that sum and adds the bar; if one is changed alone, this fails
    const arranging = prop(rule('.dashboard:has(.dashboard-bar.arranging)'), 'scroll-padding-top')!.replace(/\s+/g, ' ')
    expect(arranging).toContain(padding)
  })

  it('the shelf keeps its haze', () => {
    expect(prop(rule('.topbar'), 'background')).toMatch(/^linear-gradient\(/)
  })
})
