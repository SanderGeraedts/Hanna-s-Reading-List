import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from './creatures/choices'
import { mergeLogs } from './creatures/choices'
import { FACTS_SEEN_KEY, MARK_IS_A_SETTING, factsSeen, factsSeenEvent } from './factsSeen'

/** The mark that keeps her facts going forward (D-0079). */

const at = (n: number, body: Record<string, unknown>): ChoiceEvent =>
  ({ id: `e${n}`, at: 1_700_000_000_000 + n, ...body }) as ChoiceEvent

const mark = (n: number, count: number) => at(n, factsSeenEvent(count))

describe('reading the mark', () => {
  it('is nothing on a log that has never had one', () => {
    expect(factsSeen([])).toBe(0)
    expect(factsSeen([at(1, { kind: 'feed', pet: 'p', amount: 3 })])).toBe(0)
  })

  it('takes the highest mark in the log, not the newest, so it can never go backwards', () => {
    expect(factsSeen([mark(1, 4), mark(2, 9)])).toBe(9)
    expect(factsSeen([mark(2, 9), mark(1, 4)])).toBe(9)
    // the newer event carries the lower count: the higher one still wins while both are there
    expect(factsSeen([mark(1, 9), mark(2, 4)])).toBe(9)
  })

  it('ignores another feature’s place events', () => {
    const bingo = at(5, { kind: 'place', key: 'b:2026:1:3', sq: 'rain' })
    const den = at(6, { kind: 'place', key: 'home:2', item: 'mug' })
    expect(factsSeen([bingo, den, mark(1, 2)])).toBe(2)
    expect(factsSeen([bingo, den])).toBe(0)
  })

  it('ignores a mark that is not a whole number above zero', () => {
    for (const bad of [0, -3, 'seven', null, undefined, Number.NaN, Infinity]) {
      expect(factsSeen([at(1, { kind: 'place', key: FACTS_SEEN_KEY, n: bad })])).toBe(0)
    }
    expect(factsSeen([at(1, { kind: 'place', key: FACTS_SEEN_KEY, n: 4.7 })])).toBe(4)
  })

  it('never writes a strange number itself', () => {
    expect(factsSeenEvent(4.7).n).toBe(4)
    expect(factsSeenEvent(-2).n).toBe(0)
    expect(factsSeenEvent(12)).toEqual({ kind: 'place', key: FACTS_SEEN_KEY, n: 12 })
  })
})

describe('what the mark costs in the log', () => {
  it('is one event however many times it moves on, because place is a setting', () => {
    expect(MARK_IS_A_SETTING).toBe(true)
    const log = mergeLogs([mark(1, 1), mark(2, 2), mark(3, 3), mark(4, 4)])
    expect(log.filter((e) => (e as { key?: string }).key === FACTS_SEEN_KEY)).toHaveLength(1)
    expect(factsSeen(log)).toBe(4)
  })

  it('leaves the other features’ place events alone when it is merged', () => {
    const bingo = at(5, { kind: 'place', key: 'b:2026:1:3', sq: 'rain' })
    const log = mergeLogs([mark(1, 1), bingo], [mark(9, 6)])
    expect(factsSeen(log)).toBe(6)
    expect(log.some((e) => (e as { key?: string }).key === 'b:2026:1:3')).toBe(true)
  })

  it('takes the higher mark when two devices meet', () => {
    const phone = [mark(10, 12)]
    const laptop = [mark(4, 7)]
    expect(factsSeen(mergeLogs(phone, laptop))).toBe(12)
    expect(factsSeen(mergeLogs(laptop, phone))).toBe(12)
  })
})
