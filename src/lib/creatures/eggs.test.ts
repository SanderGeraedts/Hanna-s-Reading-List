import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import type { OwnChallenge } from '../ownChallenges'
import { readingDays } from './cookies'
import { addDays } from './days'
import { earnedEggs, eggSpecies, eggTier, nextEgg, streakNow } from './eggs'
import type { Egg } from './eggs'
import { isShinyEgg } from './creature'
import { CREATURES_START } from './numbers'
import { SPECIES, TIERS } from './species'
import { eggReason, eggsWaitingLine, nextEggLine, ordinal } from './words'

/** Milestone eggs (T-0030 Goal 1, D-0033 §6): each once, on the right day, with the right tier, nothing before the start. */

const S = CREATURES_START
const day = (n: number) => addDays(S, n)
let next = 0
const book = (over: Partial<Book> = {}): Book => ({ id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'read', addedAt: 0, ...over })

/** n books, the i-th finished on day(i) (a short one, so hours stay out of the way). */
const finishedBooks = (n: number, first = 0) => Array.from({ length: n }, (_, i) => book({ pages: 10, finished: [day(first + i)] }))
const eggs = (books: Book[], today: string, challenges: OwnChallenge[] = []) => earnedEggs(books, readingDays(books), today, challenges)
const ids = (list: Egg[]) => list.map((e) => e.id)

describe('book eggs', () => {
  it('gives an egg every 5th finished book, on the day of that book', () => {
    const list = eggs(finishedBooks(12), day(20))
    expect(list.filter((e) => e.kind === 'books')).toEqual([
      { id: 'm:books-5', tier: 'common', kind: 'books', day: day(4), n: 5 },
      { id: 'm:books-10', tier: 'common', kind: 'books', day: day(9), n: 10 },
    ])
  })

  it('makes the 25th rare and the 50th legendary', () => {
    const list = eggs(finishedBooks(50), day(60)).filter((e) => e.kind === 'books')
    expect(list.map((e) => [e.n, e.tier])).toEqual([
      [5, 'common'], [10, 'common'], [15, 'common'], [20, 'common'], [25, 'rare'],
      [30, 'common'], [35, 'common'], [40, 'common'], [45, 'common'], [50, 'legendary'],
    ])
  })

  it('counts nothing before the start, and nothing after today', () => {
    // four before the start, five after: only one egg, for the 5th book from the start
    const books = [...finishedBooks(4, -10), ...finishedBooks(5)]
    expect(ids(eggs(books, day(30)).filter((e) => e.kind === 'books'))).toEqual(['m:books-5'])
    expect(eggs(books, day(3)).filter((e) => e.kind === 'books')).toEqual([])
  })

  it('counts a re-read again', () => {
    const b = book({ pages: 10, finished: [day(0), day(1), day(2), day(3), day(4)] })
    expect(ids(eggs([b], day(5)))).toContain('m:books-5')
  })
})

describe('hour eggs', () => {
  it('gives an egg every 10 hours read or listened, the day the total gets there', () => {
    // 400 pages = 600 minutes; read in 5 days of 20 % (120 min each)
    const b = book({ status: 'reading', pages: 400, readingLog: { [day(0)]: 0.2, [day(1)]: 0.2, [day(2)]: 0.2, [day(3)]: 0.2, [day(4)]: 0.2 } })
    const list = eggs([b], day(10)).filter((e) => e.kind === 'hours')
    expect(list).toEqual([{ id: 'm:hours-10', tier: 'common', kind: 'hours', day: day(4), n: 10 }])
  })

  it('makes the 100th hour rare, and counts each step once', () => {
    // 6000 minutes in one day: ten eggs on that day
    const b = book({ status: 'reading', formats: ['storytel'], minutes: 6000, pages: 6000, readingLog: { [day(1)]: 1 } })
    const list = eggs([b], day(1)).filter((e) => e.kind === 'hours')
    expect(list.map((e) => e.id)).toEqual(Array.from({ length: 10 }, (_, i) => `m:hours-${(i + 1) * 10}`))
    expect(list.at(-1)!.tier).toBe('rare')
    expect(list.slice(0, 9).every((e) => e.tier === 'common')).toBe(true)
  })

  it('ignores reading before the start', () => {
    const b = book({ status: 'reading', formats: ['storytel'], minutes: 6000, pages: 6000, readingLog: { [day(-1)]: 1 } })
    expect(eggs([b], day(5))).toEqual([])
  })
})

describe('streak eggs', () => {
  const daily = (n: number, from = 0) => {
    const log: Record<string, number> = {}
    for (let i = 0; i < n; i++) log[day(from + i)] = 0.001
    return book({ status: 'reading', pages: 300, readingLog: log })
  }

  it('gives 7 days uncommon, 30 very rare and 100 epic, each once, on the day it is reached', () => {
    const list = eggs([daily(100)], day(120)).filter((e) => e.kind === 'streak')
    expect(list).toEqual([
      { id: 'm:streak-7', tier: 'uncommon', kind: 'streak', day: day(6), n: 7 },
      { id: 'm:streak-30', tier: 'very rare', kind: 'streak', day: day(29), n: 30 },
      { id: 'm:streak-100', tier: 'epic', kind: 'streak', day: day(99), n: 100 },
    ])
  })

  it('gives the 7-day egg only once, even after a second streak', () => {
    const two = book({ status: 'reading', pages: 300, readingLog: Object.fromEntries([...Array(7).keys(), ...Array.from({ length: 7 }, (_, i) => 10 + i)].map((i) => [day(i), 0.001])) })
    expect(eggs([two], day(30)).filter((e) => e.kind === 'streak').map((e) => e.id)).toEqual(['m:streak-7'])
  })

  it('counts only days from the start', () => {
    // 6 days before the start and 1 on it: no streak egg yet
    expect(eggs([daily(7, -6)], day(3)).filter((e) => e.kind === 'streak')).toEqual([])
    expect(streakNow(readingDays([daily(7, -6)]), day(0))).toBe(1)
  })
})

describe('series, challenges and bingo', () => {
  it('gives an uncommon egg for a finished series, on the day its last book was finished', () => {
    const series = [
      book({ title: 'The Fellowship of the Ring', series: 'The Lord of the Rings', seriesIndex: 1, pages: 10, finished: [day(1)] }),
      book({ title: 'The Two Towers', series: 'The Lord of the Rings', seriesIndex: 2, pages: 10, finished: [day(3)] }),
    ] as Book[]
    const list = eggs(series, day(5)).filter((e) => e.kind === 'series')
    expect(list.length).toBe(1)
    expect(list[0]).toMatchObject({ tier: 'uncommon', day: day(3), label: 'The Lord of the Rings' })
    expect(list[0].id).toMatch(/^m:series-[a-z0-9]+$/)
    expect(eggReason(list[0])).toBe('For finishing The Lord of the Rings')
    // a series finished before the start gives nothing
    const old = series.map((b) => ({ ...b, finished: [day(-5)] }))
    expect(eggs(old, day(5)).filter((e) => e.kind === 'series')).toEqual([])
  })

  it('gives an uncommon egg for her own challenge, the day the target is reached', () => {
    const year = Number(S.slice(0, 4))
    const c: OwnChallenge = { id: 'c1', name: 'Three books', target: 3, year, rule: 'any' }
    const books = finishedBooks(3)
    const list = eggs(books, day(10), [c]).filter((e) => e.kind === 'challenge')
    expect(list).toEqual([{ id: 'm:challenge-c1', tier: 'uncommon', kind: 'challenge', day: day(2), label: 'Three books' }])
    expect(eggReason(list[0])).toBe('For the challenge Three books')
  })

  it("gives an uncommon egg for a month's challenge done", () => {
    const month = S.slice(0, 7)
    const b = book({ pages: 10, challengeMonth: month, finished: [day(1)] })
    const list = eggs([b], day(2)).filter((e) => e.kind === 'month')
    expect(list).toEqual([{ id: `m:challenge-month-${month}`, tier: 'uncommon', kind: 'month', day: day(1), label: month }])
    expect(eggReason(list[0])).toMatch(/^For \w+'s challenge$/)
  })

  it('knows the tier of every egg id from the id alone', () => {
    expect(eggTier('welcome')).toBe('common')
    expect(eggTier('m:books-5')).toBe('common')
    expect(eggTier('m:books-25')).toBe('rare')
    expect(eggTier('m:books-50')).toBe('legendary')
    expect(eggTier('m:books-7')).toBeNull()
    expect(eggTier('m:hours-100')).toBe('rare')
    expect(eggTier('m:streak-30')).toBe('very rare')
    expect(eggTier('m:streak-8')).toBeNull()
    expect(eggTier('m:bingo-2026-1')).toBe('very rare')
    expect(eggTier('m:challenge-month-2026-11')).toBe('uncommon')
    expect(eggTier('shop:anything')).toBeNull()
  })
})

describe('what an egg hatches', () => {
  it('is the same every time, and of its tier', () => {
    for (const tier of TIERS)
      for (let i = 0; i < 50; i++) {
        const id = `m:test-${tier}-${i}`
        const s = eggSpecies(id, tier)
        expect(eggSpecies(id, tier)).toBe(s)
        expect(SPECIES.find((x) => x.id === s)!.tier).toBe(tier)
      }
  })

  it('can be every species of the tier, and every species can come out shiny; duplicates more often', () => {
    const hatched = new Set<string>()
    const shiny = new Set<string>()
    let plain = 0
    let dup = 0
    const N = 20000
    for (let i = 0; i < N; i++) {
      for (const tier of TIERS) {
        const id = `m:books-${i}-${tier}`
        const s = eggSpecies(id, tier)
        hatched.add(s)
        if (isShinyEgg(id)) shiny.add(s)
      }
      if (isShinyEgg(`m:books-${i}`)) plain++
      if (isShinyEgg(`m:books-${i}`, true)) dup++
    }
    expect(hatched.size).toBe(20)
    expect(shiny.size).toBe(20)
    // 1 in 20 and 1 in 5, with room for chance
    expect(plain / N).toBeGreaterThan(0.04)
    expect(plain / N).toBeLessThan(0.06)
    expect(dup / N).toBeGreaterThan(0.18)
    expect(dup / N).toBeLessThan(0.22)
  })
})

describe('the next egg (Design §2)', () => {
  it('names the milestone furthest along, with its tier when not common', () => {
    // 3 books of 5 (60 %) beat 0 hours
    const b3 = finishedBooks(3)
    let n = nextEgg(b3, readingDays(b3), day(10), [])!
    expect(n).toEqual({ kind: 'books', left: 2, tier: 'common' })
    expect(nextEggLine(n)).toBe('Next egg: 2 more books')
    // 24 books: the 25th is rare
    const b24 = finishedBooks(24)
    n = nextEgg(b24, readingDays(b24), day(30), [])!
    expect(nextEggLine(n)).toBe('Next rare egg: 1 more book')
  })

  it('names hours with minutes, and a streak while it is going', () => {
    // 400 minutes read (2/3 of 10 h) over 5 days in a row
    const log: Record<string, number> = {}
    for (let i = 0; i < 5; i++) log[day(i)] = 0.2
    const b = book({ status: 'reading', formats: ['storytel'], minutes: 400, pages: 400, readingLog: log })
    const n = nextEgg([b], readingDays([b]), day(4), [])!
    // streak 5 of 7 (71 %) beats hours (67 %)
    expect(nextEggLine(n)).toBe('Next uncommon egg: 2 more days in a row')
    // two days later the streak is gone: hours
    const later = nextEgg([b], readingDays([b]), day(6), [])!
    expect(nextEggLine(later)).toBe('Next egg: 3 h 20 min more reading')
  })

  it('words for Waiting for you and ordinals', () => {
    expect(eggsWaitingLine([{ id: 'm:books-25', tier: 'rare', kind: 'books', day: S, n: 25 }])).toBe('A rare egg is waiting for you!')
    expect(eggsWaitingLine([{ id: 'a', tier: 'epic', kind: 'books', day: S }])).toBe('An epic egg is waiting for you!')
    const three = Array.from({ length: 3 }, (_, i) => ({ id: `${i}`, tier: 'common' as const, kind: 'books' as const, day: S }))
    expect(eggsWaitingLine(three)).toBe('3 eggs are waiting for you!')
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 25, 50, 101, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '25th', '50th', '101st', '111th'])
    expect(eggReason({ id: 'm:books-25', tier: 'rare', kind: 'books', day: S, n: 25 })).toBe('For your 25th book')
    expect(eggReason({ id: 'm:hours-10', tier: 'common', kind: 'hours', day: S, n: 10 })).toBe('For 10 hours of reading')
    expect(eggReason({ id: 'm:streak-7', tier: 'uncommon', kind: 'streak', day: S, n: 7 })).toBe('For a 7-day streak')
  })
})
