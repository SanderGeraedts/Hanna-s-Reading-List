import { describe, expect, it } from 'vitest'
import { toCelebrate } from './challengeCelebrate'

/** When a finished challenge is celebrated (T-0090, D-0060 §4). */

describe('the confetti memory', () => {
  it('records everything and celebrates nothing the first time a device looks', () => {
    const got = toCelebrate(['2026:goal', '2026:bingo'], null)
    expect(got.burst).toBe(false)
    expect(got.remember).toEqual(['2026:bingo', '2026:goal'])
  })

  it('asks for one burst however many finished at once', () => {
    const got = toCelebrate(['2026:goal', '2026:bingo'], [])
    expect(got.burst).toBe(true)
    expect(got.remember).toEqual(['2026:bingo', '2026:goal'])
  })

  it('never celebrates the same challenge twice', () => {
    expect(toCelebrate(['2026:goal'], ['2026:goal']).burst).toBe(false)
    expect(toCelebrate(['2026:goal', '2026:bingo'], ['2026:goal']).burst).toBe(true)
  })

  it('keeps a challenge remembered after it stops being complete, so it is not celebrated twice', () => {
    // she raised the goal: it is no longer complete, but it stays in the memory
    const raised = toCelebrate([], ['2026:goal'])
    expect(raised.remember).toEqual(['2026:goal'])
    // she lowered it again: still no burst
    expect(toCelebrate(['2026:goal'], raised.remember).burst).toBe(false)
  })

  it('counts the same challenge in two years as two', () => {
    expect(toCelebrate(['2025:goal', '2026:goal'], ['2025:goal']).burst).toBe(true)
  })

  it('nothing complete is nothing to do', () => {
    expect(toCelebrate([], null)).toEqual({ burst: false, remember: [] })
    expect(toCelebrate([], [])).toEqual({ burst: false, remember: [] })
  })
})
