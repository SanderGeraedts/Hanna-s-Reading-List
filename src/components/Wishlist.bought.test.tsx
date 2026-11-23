import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { wantPile } from '#/lib/insights'
import { boughtPatch, shelfBooks, wishBooks } from '#/lib/wishlist'
import { FollowUpDialog } from './FollowUpDialog'
import { WishlistCard } from './WishlistCard'

afterEach(cleanup)

const BABEL: Book = {
  id: 'w1',
  title: 'Babel',
  authors: ['R. F. Kuang'],
  color: '#1f5f6b',
  status: 'want',
  wish: true,
  addedAt: Date.parse('2026-01-05T09:00:00Z'),
  pages: 560,
  price: 22.49,
  buyUrl: 'https://example.com/babel',
}

/**
 * The block and the follow-up as the page wires them (T-0062): "I bought it ›"
 * clears the flag, dates the book today, and opens "How I have it" with the
 * wish's price already in the field.
 */
function setup(initial: Book[] = [BABEL]) {
  const state = { library: initial, bought: 0 }
  function Harness() {
    const [library, setLibrary] = useState(initial)
    const [bought, setBought] = useState<string | null>(null)
    const update = (id: string, patch: Partial<Book>) =>
      setLibrary((l) => {
        const next = l.map((b) => (b.id === id ? { ...b, ...patch } : b))
        state.library = next
        return next
      })
    return (
      <>
        <WishlistCard
          wishes={wishBooks(library)}
          onBought={(id) => {
            if (!library.some((b) => b.wish && b.id === id)) return
            state.bought++
            update(id, boughtPatch(Date.parse('2026-11-23T10:00:00Z')))
            setBought(id)
          }}
          onRemove={(id) =>
            setLibrary((l) => {
              const next = l.filter((b) => b.id !== id)
              state.library = next
              return next
            })
          }
        />
        {bought && (
          <FollowUpDialog
            key={bought}
            book={library.find((b) => b.id === bought) ?? null}
            onUpdate={update}
            onClose={() => setBought(null)}
          />
        )}
      </>
    )
  }
  render(<Harness />)
  return state
}

const price = () => screen.queryByLabelText('What did it cost? (euros)') as HTMLInputElement | null

describe('"I bought it ›" moves a wish to the shelf (T-0062, D-0044)', () => {
  it('clears the flag, dates the book today, and asks how she has it with the wish’s price', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    const book = state.library[0]
    expect(book.wish).toBeUndefined()
    expect(book.addedAt).toBe(Date.parse('2026-11-23T10:00:00Z'))
    expect(book.price).toBe(22.49)
    // the follow-up, with the formats still to pick
    expect(screen.getByRole('status').textContent).toBe('Added “Babel”.')
    expect(screen.getByRole('group', { name: 'How I have it' })).toBeTruthy()
    // no format yet, so no price field yet; it appears with the wish's price already in it
    expect(price()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hardcover' }))
    expect(price()!.value).toBe('22.49')
  })

  it('the book is then on her shelf, counted by the pile, and off the wishlist', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    expect(wishBooks(state.library)).toEqual([])
    expect(shelfBooks(state.library).map((b) => b.id)).toEqual(['w1'])
    const pile = wantPile(shelfBooks(state.library), new Date('2026-11-23T12:00:00Z'))
    expect(pile.books).toBe(1)
    expect(pile.pages).toBe(560)
    expect(screen.getByText('Nothing on your wishlist yet.')).toBeTruthy()
  })

  it('she can change the price the follow-up offers', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paperback' }))
    fireEvent.change(price()!, { target: { value: '16,99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(state.library[0].price).toBe(16.99)
    expect(state.library[0].formats).toEqual(['paperback'])
  })

  it('pressing it twice moves the book once, with no second dialog', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    expect(state.bought).toBe(1)
    // it has left the list: there is nothing left to press
    expect(screen.queryByRole('button', { name: 'I bought Babel' })).toBeNull()
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(state.bought).toBe(1)
  })

  it('a wish whose look-alike is already on the shelf still moves, and nothing is merged', () => {
    const onShelf: Book = {
      id: 's1',
      title: 'Babel',
      authors: ['R. F. Kuang'],
      color: '#1f5f6b',
      status: 'read',
      addedAt: Date.parse('2026-05-01T09:00:00Z'),
      formats: ['ebook'],
    }
    const state = setup([onShelf, BABEL])
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    // both are on the shelf; joining them is the dashboard's merge suggestion, not the wishlist's job
    expect(shelfBooks(state.library).map((b) => b.id)).toEqual(['s1', 'w1'])
    expect(wishBooks(state.library)).toEqual([])
  })

  it('closing the dialog early keeps a valid price that was in the field', () => {
    const state = setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paperback' }))
    fireEvent.change(price()!, { target: { value: '9,50' } })
    act(() => {
      ;(document.querySelector('dialog') as HTMLDialogElement).close()
    })
    expect(state.library[0].price).toBe(9.5)
  })

  it('the follow-up it opens is a dialog, headed like the add dialog (D-0013)', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'I bought Babel' }))
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(within(dialog).getByRole('heading', { name: 'Add a book' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
  })
})

