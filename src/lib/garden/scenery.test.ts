import { describe, expect, it } from 'vitest'
import { ITEM_IDS } from './numbers'
import { SCENERY, SCENERY_IDS, arrivalLines, nextScenery, readingSoFar, sceneryFor, scenerySpec } from './scenery'

/**
 * The scenery that arrives with her reading (D-0083 §2). It is never bought
 * and never placed: it turns up, and then it stays.
 */

describe('scenery arrives with her reading', () => {
  it('gives a brand new reader an empty garden to fill', () => {
    expect(sceneryFor(readingSoFar(0, 0))).toEqual([])
  })

  it('grows a hedge once she has finished three books', () => {
    expect(sceneryFor(readingSoFar(2, 2))).not.toContain('hedge')
    expect(sceneryFor(readingSoFar(3, 3))).toContain('hedge')
  })

  it('lays stepping stones for the days she reads, not the books she finishes', () => {
    // a long slow book: no finishes at all, but she has read on 25 days
    expect(sceneryFor(readingSoFar(0, 25))).toEqual(['stones'])
  })

  it('never takes a piece away again once it has arrived', () => {
    const early = sceneryFor(readingSoFar(12, 30))
    const later = sceneryFor(readingSoFar(60, 200))
    for (const id of early) expect(later).toContain(id)
  })

  it('has everything by the time she is a long way in', () => {
    expect(sceneryFor(readingSoFar(60, 120))).toEqual([...SCENERY_IDS])
  })

  it('is between five and seven pieces, each with its own line', () => {
    expect(SCENERY.length).toBeGreaterThanOrEqual(5)
    expect(SCENERY.length).toBeLessThanOrEqual(7)
    for (const s of SCENERY) {
      expect(s.line.endsWith('.')).toBe(true)
      expect(s.books + s.days).toBeGreaterThan(0)
    }
  })

  it('never shares an id with a garden item she places herself (D-0052)', () => {
    for (const id of SCENERY_IDS) expect(ITEM_IDS as readonly string[]).not.toContain(id)
  })
})

describe('what is on its way', () => {
  it('says what the next piece is waiting for, in books or in reading days', () => {
    const next = nextScenery(readingSoFar(0, 0))
    expect(next?.id).toBe('hedge')
    expect(next?.toGo).toBe('3 more books')
  })

  it('counts one book as a book and not as books', () => {
    expect(nextScenery(readingSoFar(2, 0))?.toGo).toBe('1 more book')
  })

  it('says nothing more is coming once everything has arrived', () => {
    expect(nextScenery(readingSoFar(300, 900))).toBeNull()
  })
})

describe('saying that something has arrived', () => {
  it('says nothing at all when nothing has arrived', () => {
    expect(arrivalLines([])).toBe('')
  })

  it('uses the piece’s own quiet line for one or two', () => {
    expect(arrivalLines(['hedge'])).toBe(scenerySpec('hedge').line)
    expect(arrivalLines(['hedge', 'fence'])).toContain('fence')
  })

  it('counts them instead of listing them when a lot arrive at once', () => {
    expect(arrivalLines(['hedge', 'fence', 'brook'])).toBe('3 new things have arrived in the garden.')
  })
})
