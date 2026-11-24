import { describe, expect, it } from 'vitest'
import type { Garden, Plant, YearGarden } from './garden'
import type { GardenItemId } from './numbers'
import { countNews, freshUnlocks, newness, newsLine, readSeen, snapshot, waitingLine } from './seen'
import type { GardenSeen } from './seen'

/** What is new in the garden since she last looked (T-0066). */

const plant = (id: string, stage: Plant['stage']): Plant => ({ id, stage }) as unknown as Plant

const garden = (plants: Plant[], unlocked: GardenItemId[] = []): Garden =>
  ({ years: [{ year: 2026, plants } as unknown as YearGarden], unlocked }) as unknown as Garden

const seen = (plants: Record<string, Plant['stage']>, items: GardenItemId[] = []): GardenSeen => ({ plants, items })

describe('what is new in the garden', () => {
  it('marks nothing on a first visit: a whole garden glowing is not news', () => {
    expect(newness(null, garden([plant('a', 'sprout'), plant('b', 'grown')])).size).toBe(0)
    expect(freshUnlocks(null, garden([], ['pond']))).toEqual([])
  })

  it('marks a plant that was not there last time as new', () => {
    const news = newness(seen({ a: 'sprout' }), garden([plant('a', 'sprout'), plant('b', 'sprout')]))
    expect(news.get('b')).toBe('new')
    expect(news.has('a')).toBe(false)
  })

  it('marks a plant that has moved up a stage as grown', () => {
    const news = newness(seen({ a: 'sprout', b: 'young' }), garden([plant('a', 'young'), plant('b', 'grown')]))
    expect(news.get('a')).toBe('grown')
    expect(news.get('b')).toBe('grown')
  })

  it('never marks a plant that has not changed, and nothing ever goes backwards', () => {
    expect(newness(seen({ a: 'grown', b: 'young' }), garden([plant('a', 'grown'), plant('b', 'young')])).size).toBe(0)
  })

  it('remembers the stage of every plant and which items were unlocked', () => {
    expect(snapshot(garden([plant('a', 'sprout'), plant('b', 'grown')], ['path', 'bench']))).toEqual({
      plants: { a: 'sprout', b: 'grown' },
      items: ['path', 'bench'],
    })
  })

  it('counts and says the news in a line, and says nothing when there is none', () => {
    const news = newness(seen({ a: 'sprout' }), garden([plant('a', 'young'), plant('b', 'sprout'), plant('c', 'sprout')]))
    expect(countNews(news)).toEqual({ fresh: 2, grew: 1 })
    expect(newsLine(news)).toBe('2 new plants · 1 grew')
    expect(newsLine(new Map())).toBe('')
  })

  it('says one new plant in the singular', () => {
    expect(newsLine(newness(seen({ a: 'grown' }), garden([plant('a', 'grown'), plant('b', 'sprout')])))).toBe('1 new plant')
  })
})

describe('a garden item that has unlocked since she looked', () => {
  it('names the ones that are new, and not the ones she had', () => {
    expect(freshUnlocks(seen({}, ['path']), garden([], ['path', 'bench', 'pond']))).toEqual(['bench', 'pond'])
  })

  it('names none when nothing has unlocked', () => {
    expect(freshUnlocks(seen({}, ['path', 'bench']), garden([], ['path', 'bench']))).toEqual([])
  })
})

describe('reading the note back from the device', () => {
  it('reads the note it wrote', () => {
    const g = garden([plant('a', 'young')], ['path'])
    expect(readSeen(snapshot(g), g)).toEqual({ plants: { a: 'young' }, items: ['path'] })
  })

  it('reads the first shape, counting every unlock as already seen', () => {
    // the note used to be the plain plant map: an update may not announce an old pond
    const g = garden([plant('a', 'young')], ['path', 'pond'])
    const old = readSeen({ a: 'sprout' }, g)
    expect(old).toEqual({ plants: { a: 'sprout' }, items: ['path', 'pond'] })
    expect(freshUnlocks(old, g)).toEqual([])
    expect(newness(old, g).get('a')).toBe('grown')
  })

  it('refuses anything that is not a note', () => {
    const g = garden([])
    for (const raw of [null, 'nonsense', 42, ['a']]) expect(readSeen(raw, g)).toBeNull()
  })
})

describe('the line for "Waiting for you"', () => {
  const news = (fresh: number, grew: number) => {
    const m = new Map<string, 'new' | 'grown'>()
    for (let i = 0; i < fresh; i++) m.set(`n${i}`, 'new')
    for (let i = 0; i < grew; i++) m.set(`g${i}`, 'grown')
    return m
  }

  it('says nothing at all when nothing has happened', () => {
    expect(waitingLine(new Map(), [])).toBe('')
  })

  it('puts the plants and the items in one sentence', () => {
    expect(waitingLine(news(2, 1), ['pond'])).toBe('In your garden: 2 new plants, 1 grew and a pond has unlocked.')
  })

  it('says an unlock on its own', () => {
    expect(waitingLine(new Map(), ['bench'])).toBe('In your garden: a bench has unlocked.')
  })

  it('lists two unlocks, and takes no article for a plural item', () => {
    expect(waitingLine(new Map(), ['bench', 'lanterns'])).toBe('In your garden: a bench and lanterns have unlocked.')
  })

  it('says only the plants when nothing unlocked', () => {
    expect(waitingLine(news(1, 0), [])).toBe('In your garden: 1 new plant.')
  })
})
