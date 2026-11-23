import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { badges } from './badges'
import type { Badge } from './badges'
import type { OwnChallenge } from './ownChallenges'

/** The challenges-N medal family (T-0090, D-0060 §6). */

const book = (id: string, day: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  finished: [day],
  ...extra,
})

const TODAY = '2026-11-23'
const find = (all: Badge[], id: string) => all.find((b) => b.id === id)!
const owns = (n: number): OwnChallenge[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name: `Challenge ${i}`, target: 1, year: 2026, rule: 'any' }))

describe('the challenges medals', () => {
  it('are three, with their icons, names and tiers', () => {
    const all = badges([book('a', '2026-01-02')], TODAY)
    expect(find(all, 'challenges-1')).toMatchObject({ icon: '🎖️', name: 'First challenge', how: 'Finish a challenge', tier: 'bronze' })
    expect(find(all, 'challenges-5')).toMatchObject({ icon: '🏵️', name: 'Five challenges', tier: 'silver' })
    expect(find(all, 'challenges-10')).toMatchObject({ icon: '🎗️', name: 'Ten challenges', tier: 'gold' })
  })

  it('are not earned, and show 0 of 1, on a shelf with no challenges', () => {
    const all = badges([], TODAY)
    expect(find(all, 'challenges-1')).toMatchObject({ earned: false, progress: { done: 0, goal: 1 } })
  })

  it('counts one, five and ten finished challenges', () => {
    const shelf = [book('a', '2026-01-02')]
    const one = badges(shelf, TODAY, { challenges: owns(1) })
    expect(find(one, 'challenges-1').earned).toBe(true)
    expect(find(one, 'challenges-5').earned).toBe(false)
    expect(find(one, 'challenges-5').progress).toEqual({ done: 1, goal: 5 })
    const five = badges(shelf, TODAY, { challenges: owns(5) })
    expect(find(five, 'challenges-5').earned).toBe(true)
    expect(find(five, 'challenges-10').earned).toBe(false)
    const ten = badges(shelf, TODAY, { challenges: owns(10) })
    expect(find(ten, 'challenges-10').earned).toBe(true)
  })

  it('counts the ready-made challenges too, through the goals it is given', () => {
    const shelf = [book('a', '2026-01-02')]
    expect(find(badges(shelf, TODAY, { goals: { 2026: 1 } }), 'challenges-1').earned).toBe(true)
    expect(find(badges(shelf, TODAY, { goals: { 2026: 50 } }), 'challenges-1').earned).toBe(false)
  })

  it('still works with no challenges option at all, and never crashes', () => {
    const all = badges([book('a', '2026-01-02')], TODAY)
    expect(find(all, 'challenges-1')).toBeTruthy()
    expect(find(all, 'challenges-1').earned).toBe(false)
    expect(() => badges([], TODAY, {})).not.toThrow()
  })

  it('carries no day, so it never waits under "Waiting for you"', () => {
    const all = badges([book('a', '2026-01-02')], TODAY, { challenges: owns(1) })
    expect(find(all, 'challenges-1').on).toBeUndefined()
  })
})
