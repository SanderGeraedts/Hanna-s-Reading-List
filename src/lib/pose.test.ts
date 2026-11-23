import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { POSES, poseLabel, poseOf, posePatch } from './pose'

const book = (over: Partial<Book> = {}): Book => ({
  id: 'b',
  title: 'A Book',
  authors: ['A. Author'],
  color: '#334455',
  status: 'want',
  addedAt: 1,
  ...over,
})

describe('a book’s pose (D-0044 §1)', () => {
  it('offers her three words in her order', () => {
    expect(POSES.map((p) => p.id)).toEqual(['standing', 'faceout', 'flat'])
    expect(POSES.map((p) => p.label)).toEqual(['Standing', 'Face-out', 'Lying flat'])
    expect(poseLabel('flat')).toBe('Lying flat')
  })

  it('is standing for anything that is not a pose it knows', () => {
    expect(poseOf(book())).toBe('standing')
    expect(poseOf(undefined)).toBe('standing')
    expect(poseOf(null)).toBe('standing')
    for (const raw of ['standing', 'sideways', '', null, 0, 1, [], {}])
      expect(poseOf({ pose: raw } as unknown as Book)).toBe('standing')
  })

  it('reads the two poses it does know', () => {
    expect(poseOf(book({ pose: 'faceout' }))).toBe('faceout')
    expect(poseOf(book({ pose: 'flat' }))).toBe('flat')
  })

  it('never writes "standing": Standing clears the field', () => {
    expect(posePatch('standing')).toEqual({ pose: undefined })
    expect(posePatch('faceout')).toEqual({ pose: 'faceout' })
    expect(posePatch('flat')).toEqual({ pose: 'flat' })
  })

  it('leaves a book she posed and put back byte-for-byte what it was', () => {
    const plain = book()
    const posed = { ...plain, ...posePatch('flat') }
    const back = { ...posed, ...posePatch('standing') }
    expect(JSON.stringify(back)).toBe(JSON.stringify(plain))
    expect('pose' in JSON.parse(JSON.stringify(back))).toBe(false)
  })
})
