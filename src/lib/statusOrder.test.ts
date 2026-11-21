import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { sortBooks, inStatusOrder } = await import('./library')

const b = (id: string, status: Book['status']): Book => ({ id, title: id, authors: [], color: '#888888', status, addedAt: 0 })

describe('arranged by reading status, the books she did not finish come last', () => {
  it('sorts DNF after read', () => {
    const sorted = sortBooks([b('d', 'dnf'), b('r', 'read'), b('w', 'want'), b('x', 'reading'), b('p', 'paused')], 'status')
    expect(sorted.map((x) => x.status)).toEqual(['reading', 'paused', 'want', 'read', 'dnf'])
    expect(inStatusOrder(sorted)).toBe(true)
  })

  it('notices when a changed status breaks the order, so the shelf sorts again', () => {
    const sorted = sortBooks([b('x', 'reading'), b('p', 'paused'), b('w', 'want'), b('r', 'read'), b('d', 'dnf')], 'status')
    // she puts the book she was reading aside: it moves to the DNF books at the end (keeping the order within a group)
    const changed = sorted.map((x) => (x.id === 'x' ? { ...x, status: 'dnf' as const } : x))
    expect(inStatusOrder(changed)).toBe(false)
    expect(sortBooks(changed, 'status').map((x) => x.id)).toEqual(['p', 'w', 'r', 'x', 'd'])
  })
})
