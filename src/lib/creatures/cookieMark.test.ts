import { describe, expect, it } from 'vitest'
import type { ChoiceEvent } from './choices'
import { mergeLogs } from './choices'
import { COOKIE_MARK_KEY, cookieMark, cookieMarkEvent, earnedWithMark } from './cookieMark'

/** Cookies she has earned are never taken back (D-0081). */

const at = (n: number, body: Record<string, unknown>): ChoiceEvent =>
  ({ id: `e${n}`, at: 1_700_000_000_000 + n, ...body }) as ChoiceEvent
const mark = (n: number, earned: number) => at(n, cookieMarkEvent(earned))

describe('the cookie mark', () => {
  it('is nothing on a log that has never had one', () => {
    expect(cookieMark([])).toBe(0)
    expect(cookieMark([at(1, { kind: 'feed', pet: 'p', amount: 3 })])).toBe(0)
  })

  it('takes the highest, not the newest, so two devices cannot pull it back', () => {
    expect(cookieMark([mark(1, 40), mark(2, 90)])).toBe(90)
    expect(cookieMark([mark(1, 90), mark(2, 40)])).toBe(90)
  })

  it('leaves the facts’ mark and every other feature’s place events alone', () => {
    const facts = at(3, { kind: 'place', key: 'f:seen', n: 120 })
    const bingo = at(4, { kind: 'place', key: 'b:2026:1:3', sq: 'rain' })
    expect(cookieMark([facts, bingo])).toBe(0)
    expect(cookieMark([facts, bingo, mark(5, 12)])).toBe(12)
  })

  it('ignores anything that is not a whole count above zero', () => {
    for (const bad of [0, -3, 'lots', null, Number.NaN, Infinity]) {
      expect(cookieMark([at(1, { kind: 'place', key: COOKIE_MARK_KEY, n: bad })])).toBe(0)
    }
    expect(cookieMark([at(1, { kind: 'place', key: COOKIE_MARK_KEY, n: 9.9 })])).toBe(9)
  })

  it('costs one event however many times it moves on', () => {
    const log = mergeLogs([mark(1, 10), mark(2, 20), mark(3, 30)])
    expect(log.filter((e) => (e as { key?: string }).key === COOKIE_MARK_KEY)).toHaveLength(1)
    expect(cookieMark(log)).toBe(30)
  })
})

describe('what she has earned', () => {
  it('is what her reading says, while that is the most she has had', () => {
    expect(earnedWithMark(120, 0)).toBe(120)
    expect(earnedWithMark(120, 100)).toBe(120)
  })

  it('does not fall when a day is corrected away, so a balance cannot go below zero', () => {
    // she earned 120, spent 80, then corrected a day that was worth 50
    const earnedAfterTheFix = 70
    const mark = 120
    const spent = 80
    expect(earnedAfterTheFix - spent).toBeLessThan(0)
    expect(earnedWithMark(earnedAfterTheFix, mark) - spent).toBe(40)
  })

  it('still goes up when she corrects a day upwards, or reads more', () => {
    expect(earnedWithMark(150, 120)).toBe(150)
  })
})
