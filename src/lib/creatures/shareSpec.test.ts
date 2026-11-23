import { describe, expect, it } from 'vitest'
import { albumShare, petCardShare } from './shareSpec'
import type { Pet } from './creature'
import { SPECIES } from './species'

const pet = (p: Partial<Pet> = {}): Pet =>
  ({
    id: 'p1',
    species: 'cat',
    shiny: false,
    tier: 'common',
    name: 'Biscuit',
    suggested: 'Biscuit',
    hatchedAt: 0,
    hatchDay: '2026-11-23',
    fed: 0,
    readingDays: 0,
    powerUps: 0,
    growth: 0,
    level: 3,
    into: 0,
    need: 20,
    stage: 'baby',
    mood: null,
    ...p,
  }) as Pet

describe('creature share pictures (T-0032 Design §9)', () => {
  it('card is one column, one tile, with name, level and stage', () => {
    const spec = petCardShare(pet())
    expect(spec.columns).toBe(1)
    expect(spec.tiles.length).toBe(1)
    expect(spec.tiles[0].label).toBe('Biscuit')
    expect(spec.title).toContain('Biscuit')
    expect(spec.subtitle).toContain('Level 3')
  })

  it('album shows every species, the found ones ticked', () => {
    const found = new Set(['cat'])
    const spec = albumShare(SPECIES, found, new Set())
    expect(spec.tiles.length).toBe(SPECIES.length)
    expect(spec.tiles.filter((t) => t.on).length).toBe(1)
    expect(spec.columns).toBe(5)
    expect(albumShare(SPECIES, found, new Set(), true).columns).toBe(3)
  })
})
