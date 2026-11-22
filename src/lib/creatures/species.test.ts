import { describe, expect, it } from 'vitest'
import { EYE, SPECIES, TIER_OF_CATEGORY, TIERS, redListLabel, speciesById } from './species'
import type { CreaturePalette, Tier } from './species'

const HEX = /^#[0-9a-f]{6}$/

function paletteOk(p: CreaturePalette) {
  for (const v of Object.values(p)) expect(v).toMatch(HEX)
  expect(p.eye).toBe(EYE)
}

describe('the 20 creatures (T-0027, D-0033)', () => {
  it('has exactly 20 species with unique ids', () => {
    expect(SPECIES).toHaveLength(20)
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(20)
  })

  it('has the tiers 5 / 3 / 3 / 3 / 2 / 4, in that order', () => {
    const count = (t: Tier) => SPECIES.filter((s) => s.tier === t).length
    expect(TIERS.map(count)).toEqual([5, 3, 3, 3, 2, 4])
    const order = SPECIES.map((s) => TIERS.indexOf(s.tier))
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('lists the five commons first (her first pick, D-0033 §3)', () => {
    expect(SPECIES.slice(0, 5).every((s) => s.tier === 'common')).toBe(true)
  })

  it('gives every real animal a scientific name, a Red List category matching its tier, and a source', () => {
    for (const s of SPECIES.filter((x) => x.tier !== 'legendary')) {
      expect(s.scientificName, s.id).toBeTruthy()
      expect(s.redList, s.id).toBeDefined()
      expect(TIER_OF_CATEGORY[s.redList!.category], s.id).toBe(s.tier)
      expect(s.redList!.sources.length, s.id).toBeGreaterThan(0)
      for (const url of s.redList!.sources) expect(url, s.id).toMatch(/^https:\/\//)
    }
  })

  it('keeps the fantasy creatures legendary, without a Red List category', () => {
    const fantasy = SPECIES.filter((s) => !s.scientificName)
    expect(fantasy.map((s) => s.id)).toEqual(['book-dragon', 'library-owl', 'bookmark-fox', 'starlight-unicorn'])
    for (const s of fantasy) {
      expect(s.tier).toBe('legendary')
      expect(s.redList).toBeUndefined()
    }
  })

  it('gives all 20 a shiny and a shiny palette that differs in body colour (D-0033 §5)', () => {
    for (const s of SPECIES) {
      expect(s.shiny, s.id).toBe(true)
      paletteOk(s.palette)
      paletteOk(s.shinyPalette)
      expect(s.shinyPalette.body, s.id).not.toBe(s.palette.body)
    }
  })

  it('follows the Red List corrections: emperor penguin very rare, koala rare', () => {
    expect(speciesById('emperor-penguin').tier).toBe('very rare')
    expect(speciesById('koala').tier).toBe('rare')
  })

  it('labels the card with the category in words', () => {
    expect(redListLabel(speciesById('cat'))).toBe('Domestic, not on the Red List')
    expect(redListLabel(speciesById('koala'))).toBe('Vulnerable')
    expect(redListLabel(speciesById('axolotl'))).toBe('Critically Endangered')
  })
})
