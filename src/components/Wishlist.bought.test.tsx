import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { wantPile } from '#/lib/insights'
import { boughtPatch, shelfBooks, wishBooks } from '#/lib/wishlist'
import { FollowUpDialog } from './FollowUpDialog'
import { WishRow } from './WishRow'

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
 * The wish row in the book panel and the follow-up as the page wires them
 * (T-0072, now D-0074 §5): "I bought it ›" clears the flag, dates the book
 * today, and opens "How I have it" with the wish's price already in the field.
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
    // removed from the wishlist: the panel closes with the book, as it does on the page
    const open = library.find((b) => b.id === 'w1')
    if (!open) return null
    return (
      <>
        {/* the panel's own title, which focus comes back to when the dialog closes */}
        <h2 id="book-panel-title" tabIndex={-1}>
          {open.title}
        </h2>
        {open.wish && (
          <WishRow
            book={open}
            onBought={() => {
              state.bought++
              update(open.id, boughtPatch(Date.parse('2026-11-23T10:00:00Z')))
              setBought(open.id)
            }}
            onRemove={() =>
              setLibrary((l) => {
                const next = l.filter((b) => b.id !== open.id)
                state.library = next
                return next
              })
            }
          />
        )}
        {bought && (
          <FollowUpDialog
            key={bought}
            book={library.find((b) => b.id === bought) ?? null}
            onUpdate={update}
            onClose={() => setBought(null)}
            returnFocusId="book-panel-title"
          />
        )}
      </>
    )
  }
  render(<Harness />)
  return state
}

const price = () => screen.queryByLabelText('What did it cost? (euros)') as HTMLInputElement | null
const buy = () => screen.getByRole('button', { name: 'I bought it ›' })

describe('"I bought it ›" moves a wish to the shelf (T-0072, D-0053, D-0074 §5)', () => {
  it('clears the flag, dates the book today, and asks how she has it with the wish’s price', () => {
    const state = setup()
    fireEvent.click(buy())
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
    fireEvent.click(buy())
    expect(wishBooks(state.library)).toEqual([])
    expect(shelfBooks(state.library).map((b) => b.id)).toEqual(['w1'])
    const pile = wantPile(shelfBooks(state.library), new Date('2026-11-23T12:00:00Z'))
    expect(pile.books).toBe(1)
    expect(pile.pages).toBe(560)
    // the wish row has gone with the wish
    expect(screen.queryByRole('group', { name: 'Wishlist' })).toBeNull()
  })

  it('she can change the price the follow-up offers', () => {
    const state = setup()
    fireEvent.click(buy())
    fireEvent.click(screen.getByRole('button', { name: 'Paperback' }))
    fireEvent.change(price()!, { target: { value: '16,99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(state.library[0].price).toBe(16.99)
    expect(state.library[0].formats).toEqual(['paperback'])
  })

  it('cannot be pressed twice: it goes with the wish, and there is one dialog', () => {
    const state = setup()
    fireEvent.click(buy())
    expect(state.bought).toBe(1)
    expect(screen.queryByRole('button', { name: 'I bought it ›' })).toBeNull()
    expect(screen.getAllByRole('status')).toHaveLength(1)
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
    fireEvent.click(buy())
    // both are on the shelf; joining them is the panel's merge suggestion, not the wishlist's job
    expect(shelfBooks(state.library).map((b) => b.id)).toEqual(['s1', 'w1'])
    expect(wishBooks(state.library)).toEqual([])
  })

  it('closing the dialog early keeps a valid price that was in the field', () => {
    const state = setup()
    fireEvent.click(buy())
    fireEvent.click(screen.getByRole('button', { name: 'Paperback' }))
    fireEvent.change(price()!, { target: { value: '9,50' } })
    act(() => {
      ;(document.querySelector('dialog') as HTMLDialogElement).close()
    })
    expect(state.library[0].price).toBe(9.5)
  })

  it('closing the follow-up puts focus back on the open book, not nowhere', () => {
    setup()
    fireEvent.click(buy())
    act(() => {
      ;(document.querySelector('dialog') as HTMLDialogElement).close()
    })
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Babel' }))
  })

  it('the follow-up it opens is a dialog, headed like the add dialog (D-0013)', () => {
    setup()
    fireEvent.click(buy())
    const dialog = document.querySelector('dialog') as HTMLDialogElement
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(within(dialog).getByRole('heading', { name: 'Add a book' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeTruthy()
  })
})

describe('the wish row itself (D-0074 §5)', () => {
  it('shows the price, a safe Buy link and Remove, and takes the wish off the list', () => {
    const state = setup()
    expect(screen.getByText('€22.49 · not on your shelf yet')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Buy Babel' }) as HTMLAnchorElement
    expect(link.href).toBe('https://example.com/babel')
    expect(link.rel).toContain('noreferrer')
    fireEvent.click(screen.getByRole('button', { name: 'Remove from the wishlist' }))
    expect(state.library).toEqual([])
  })

  it('leaves out the Buy button for a wish with no link, and a link that is not http(s)', () => {
    cleanup()
    setup([{ ...BABEL, buyUrl: undefined, price: undefined }])
    expect(screen.queryByRole('link', { name: 'Buy Babel' })).toBeNull()
    expect(screen.getByText('Not on your shelf yet')).toBeTruthy()
    cleanup()
    setup([{ ...BABEL, buyUrl: 'javascript:alert(1)' }])
    expect(screen.queryByRole('link', { name: 'Buy Babel' })).toBeNull()
  })
})
