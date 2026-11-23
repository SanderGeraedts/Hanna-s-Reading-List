import { describe, expect, it } from 'vitest'
import type { Garden, Plant, YearGarden } from './garden'
import { countNews, newness, newsLine, snapshot } from './seen'
import type { Seen } from './seen'

/** What is new in the garden since she last looked (T-0066). */

const plant = (id: string, stage: Plant['stage']): Plant => ({ id, stage }) as unknown as Plant

const garden = (...plants: Plant[]): Garden =>
  ({ years: [{ year: 2026, plants } as unknown as YearGarden] }) as unknown as Garden

describe('what is new in the garden', () => {
  it('marks nothing on a first visit: a whole garden glowing is not news', () => {
    expect(newness(null, garden(plant('a', 'sprout'), plant('b', 'grown'))).size).toBe(0)
  })

  it('marks a plant that was not there last time as new', () => {
    const seen: Seen = { a: 'sprout' }
    const news = newness(seen, garden(plant('a', 'sprout'), plant('b', 'sprout')))
    expect(news.get('b')).toBe('new')
    expect(news.has('a')).toBe(false)
  })

  it('marks a plant that has moved up a stage as grown', () => {
    const news = newness({ a: 'sprout', b: 'young' }, garden(plant('a', 'young'), plant('b', 'grown')))
    expect(news.get('a')).toBe('grown')
    expect(news.get('b')).toBe('grown')
  })

  it('never marks a plant that has not changed, and nothing ever goes backwards', () => {
    const news = newness({ a: 'grown', b: 'young' }, garden(plant('a', 'grown'), plant('b', 'young')))
    expect(news.size).toBe(0)
  })

  it('remembers the stage of every plant in every year', () => {
    expect(snapshot(garden(plant('a', 'sprout'), plant('b', 'grown')))).toEqual({ a: 'sprout', b: 'grown' })
  })

  it('counts and says the news in a line, and says nothing when there is none', () => {
    const news = newness({ a: 'sprout' }, garden(plant('a', 'young'), plant('b', 'sprout'), plant('c', 'sprout')))
    expect(countNews(news)).toEqual({ fresh: 2, grew: 1 })
    expect(newsLine(news)).toBe('2 new plants · 1 grew')
    expect(newsLine(new Map())).toBe('')
  })

  it('says one new plant in the singular', () => {
    expect(newsLine(newness({ a: 'grown' }, garden(plant('a', 'grown'), plant('b', 'sprout'))))).toBe('1 new plant')
  })
})
