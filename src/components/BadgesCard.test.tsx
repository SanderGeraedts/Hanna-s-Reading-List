import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
const { BadgesCard } = await import('./NewBlocks')

const books: Book[] = [
  { id: 'a', title: 'Circe', authors: ['M'], color: '#c99a45', status: 'read', addedAt: 1, finished: ['2026-03-01'], readCount: 1 },
]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the Badges block can be folded', () => {
  it('folds the list away, keeps the count, and remembers it on this device', () => {
    render(<BadgesCard books={books} />)
    const fold = screen.getByRole('button', { name: /Badges/ })
    expect(fold.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('badges-list')!.hidden).toBe(false)
    fireEvent.click(fold)
    expect(fold.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
    expect(screen.getByText(/unlocked/)).toBeTruthy()
    cleanup()
    render(<BadgesCard books={books} />)
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
  })
})
