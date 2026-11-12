import { describe, expect, it, vi } from 'vitest'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanEdges, edgesFromCover } = await import('./edges')

describe('page edges (#98)', () => {
  it('keeps only patterns the app can paint and real colours', () => {
    expect(cleanEdges({ pattern: 'stars', colors: ['#112233', '#D8B25A'] })).toEqual({
      pattern: 'stars',
      colors: ['#112233', '#d8b25a'],
    })
    expect(cleanEdges({ pattern: 'unicorns', colors: ['#112233'] })).toBeUndefined()
    expect(cleanEdges({ pattern: 'dots', colors: ['red', 'blue'] })).toBeUndefined()
    expect(cleanEdges(null)).toBeUndefined()
  })

  it('makes one colour two, and takes at most three', () => {
    expect(cleanEdges({ pattern: 'sprayed', colors: ['#aa0000'] })?.colors).toEqual(['#aa0000', '#aa0000'])
    expect(cleanEdges({ pattern: 'dots', colors: ['#000001', '#000002', '#000003', '#000004'] })?.colors).toHaveLength(3)
  })

  it('keeps what she asked the AI for', () => {
    expect(cleanEdges({ pattern: 'moons', colors: ['#000000', '#ffffff'], prompt: '  moons at night ' })?.prompt).toBe(
      'moons at night',
    )
  })

  it('from the cover: its colour, with gold on a dark cover', () => {
    expect(edgesFromCover({ color: '#101820' })).toEqual({ pattern: 'sprayed', colors: ['#101820', '#d8b25a'] })
    expect(edgesFromCover({ color: '#e0662a' }).colors[0]).toBe('#e0662a')
  })
})
