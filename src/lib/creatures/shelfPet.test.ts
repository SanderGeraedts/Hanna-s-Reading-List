import { describe, expect, it } from 'vitest'
import { shelfPetId, shouldCheer, finishedToday } from './shelfPet'
import type { ChoiceEvent } from './choices'
import type { Book } from '../library'

const ev = (id: string, at: number, pet: string): ChoiceEvent =>
  ({ id, at, kind: 'shelf', key: 'shelf', pet }) as unknown as ChoiceEvent

const living = new Set(['p1', 'p2'])

describe('shelf pet choice (T-0033 §8b)', () => {
  it('newest wins', () => {
    const log = [ev('s1', 1, 'p1'), ev('s2', 2, 'p2')]
    expect(shelfPetId(log, living)).toBe('p2')
  })

  it('empty when none chosen', () => {
    expect(shelfPetId([], living)).toBeNull()
  })

  it('"take off" is an empty pet value', () => {
    const log = [ev('s1', 1, 'p1'), ev('s2', 2, '')]
    expect(shelfPetId(log, living)).toBeNull()
  })

  it('released: falls back to her first remaining pet', () => {
    const log = [ev('s1', 1, 'gone')]
    expect(shelfPetId(log, living, 'p1')).toBe('p1')
  })
})

const book = (p: Partial<Book>): Book =>
  ({ id: 'b', title: 't', addedAt: '2026', status: 'read', finished: ['2026-11-23'], ...p }) as Book

describe('finished-today cheer (T-0033 §8d)', () => {
  it('cheers when a finish day matches', () => {
    expect(finishedToday([book({})], '2026-11-23')).toBe(true)
  })

  it('does not cheer when nothing finished today', () => {
    expect(finishedToday([book({ finished: ['2026-11-22'] })], '2026-11-23')).toBe(false)
  })

  it('cheer is only once per day', () => {
    const b = [book({})]
    expect(shouldCheer(b, '2026-11-23', false)).toBe(true)
    expect(shouldCheer(b, '2026-11-23', true)).toBe(false)
  })
})
