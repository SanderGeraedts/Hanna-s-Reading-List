import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book, NewBook } from '#/lib/library'
import type { CoverAnalysis } from '#/lib/cover'
import type { SearchResult } from '#/server/openLibrary'

const ol = vi.hoisted(() => ({
  search: vi.fn<() => Promise<SearchResult[]>>(),
  details: vi.fn<() => Promise<{ description?: string; genres: string[] }>>(),
  covers: vi.fn<() => Promise<number[]>>(),
}))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: () => ol.search(),
  getWorkDetails: () => ol.details(),
  getCoverChoices: () => ol.covers(),
  lookupIsbn: async () => null,
}))
vi.mock('#/server/storytel', () => ({
  forgetStorytelLogin: async () => ({ saved: false }),
  importStorytelLibrary: async () => [],
  storytelLoginStatus: async () => ({ saved: false }),
}))
// the camera is stubbed, never asked for
vi.mock('./BarcodeScanner', () => ({
  canScanBarcodes: () => true,
  BarcodeScanner: () => null,
}))
const analyzeCover = vi.hoisted(() => vi.fn<(url: string) => Promise<CoverAnalysis | null>>())
vi.mock('#/lib/cover', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/cover')>()),
  analyzeCover,
}))

const { AddBookDialog } = await import('./AddBookDialog')

const ANALYSIS: CoverAnalysis = { color: '#7a2e2e', aspect: 0.66, palette: ['#7a2e2e'] }

const BABEL: SearchResult = {
  workKey: '/works/OL1W',
  title: 'Babel',
  authors: ['R. F. Kuang'],
  coverId: 11,
}

/** the dialog the way the shelf uses it, with the added book really joining the library */
function setup(existing: Book[] = []) {
  const state = { library: [...existing], added: [] as NewBook[], closed: 0 }
  function Harness() {
    const [library, setLibrary] = useState(existing)
    return (
      <AddBookDialog
        existing={library}
        onAdd={(b) => {
          state.added.push(b)
          const full: Book = { ...b, id: `new${state.added.length}`, status: b.status ?? 'want', addedAt: Date.now() }
          state.library = [...state.library, full]
          setLibrary((l) => [...l, full])
          return full
        }}
        onUpdate={(id, patch) => {
          state.library = state.library.map((b) => (b.id === id ? { ...b, ...patch } : b))
          setLibrary((l) => l.map((b) => (b.id === id ? { ...b, ...patch } : b)))
        }}
        onClose={() => state.closed++}
        storytelLogin={{ saved: false }}
        onStorytelLogin={() => {}}
        initialTab="wish"
      />
    )
  }
  render(<Harness />)
  return state
}

const tab = (name: string) => screen.getByRole('tab', { name })
/** the wish follow-up, so its fields are not confused with the By-hand form's */
const fu = () => within(document.querySelector('.add-follow-up') as HTMLElement)
/** the cover step's own primary button, not the By-hand form's */
const coverAdd = () => within(document.querySelector('.cover-step') as HTMLElement).getByRole('button', { name: 'Add to wishlist' })
async function search(query = 'babel') {
  fireEvent.change(screen.getAllByPlaceholderText('Title, author or both…')[0], { target: { value: query } })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(450)
  })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  analyzeCover.mockReset()
  analyzeCover.mockResolvedValue(ANALYSIS)
  ol.search.mockReset()
  ol.search.mockResolvedValue([BABEL])
  ol.details.mockReset()
  ol.details.mockResolvedValue({ genres: ['Fantasy'] })
  ol.covers.mockReset()
  ol.covers.mockResolvedValue([11, 12])
})

describe('Add to wishlist, in + Add (T-0062)', () => {
  it('is the sixth tab of the add dialog', () => {
    setup()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Search',
      'Scan',
      'ISBN',
      'Manual',
      'Storytel',
      'Wishlist',
    ])
    expect(tab('Wishlist').getAttribute('aria-selected')).toBe('true')
  })

  it('searching and picking a cover adds a wish, not a shelf book', async () => {
    const state = setup()
    await search()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to wishlist' })[0])
    await act(async () => {})
    // the cover step, with the wishlist's words on its primary button
    expect(screen.getByRole('radiogroup', { name: 'Cover' })).toBeTruthy()
    expect(state.added).toEqual([])
    await act(async () => {
      fireEvent.click(coverAdd())
    })
    expect(state.added).toHaveLength(1)
    expect(state.added[0]).toMatchObject({ title: 'Babel', wish: true, coverUrl: '/api/cover/id/11?size=L' })
  })

  it('then asks what it will cost and where to buy it, and saves both', async () => {
    const state = setup()
    await search()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to wishlist' })[0])
    await act(async () => {})
    await act(async () => {
      fireEvent.click(coverAdd())
    })
    expect(screen.getByRole('status').textContent).toBe('Added “Babel” to your wishlist.')
    fireEvent.change(fu().getByLabelText('What will it cost? (euros)'), { target: { value: '22,49' } })
    fireEvent.change(fu().getByLabelText('Where to buy it'), { target: { value: 'https://example.com/babel' } })
    fireEvent.click(fu().getByRole('button', { name: 'Done' }))
    const wish = state.library.at(-1)!
    expect(wish.price).toBe(22.49)
    expect(wish.buyUrl).toBe('https://example.com/babel')
  })

  it('refuses a link that is not a web link, and keeps the step open', async () => {
    const state = setup()
    await search()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to wishlist' })[0])
    await act(async () => {})
    await act(async () => {
      fireEvent.click(coverAdd())
    })
    fireEvent.change(fu().getByLabelText('Where to buy it'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(fu().getByRole('button', { name: 'Done' }))
    expect(fu().getByText('Only links that start with https:// or http:// can be opened here.')).toBeTruthy()
    expect(state.library.at(-1)!.buyUrl).toBeUndefined()
  })

  it('Skip keeps neither the price nor the link', async () => {
    const state = setup()
    await search()
    fireEvent.click(screen.getAllByRole('button', { name: 'Add to wishlist' })[0])
    await act(async () => {})
    await act(async () => {
      fireEvent.click(coverAdd())
    })
    fireEvent.change(fu().getByLabelText('What will it cost? (euros)'), { target: { value: '22,49' } })
    fireEvent.click(fu().getByRole('button', { name: 'Skip' }))
    expect(state.library.at(-1)!.price).toBeUndefined()
  })

  it('a book already on the shelf or already wished for cannot be wished for again', async () => {
    const onShelf: Book = { id: 'a', title: 'Babel', authors: ['R. F. Kuang'], color: '#333', status: 'read', addedAt: 1, workKey: '/works/OL1W' }
    setup([onShelf])
    await search()
    expect(screen.getByRole('button', { name: 'On shelf' }).hasAttribute('disabled')).toBe(true)
    cleanup()
    setup([{ ...onShelf, wish: true }])
    await search()
    expect(screen.getByRole('button', { name: 'On your wishlist' }).hasAttribute('disabled')).toBe(true)
  })

  it('By hand adds a wish from a title alone', async () => {
    const state = setup()
    const byHand = screen.getByText('By hand').parentElement as HTMLDetailsElement
    byHand.open = true
    fireEvent.change(within(byHand).getByLabelText('Title *'), { target: { value: 'An Unpublished Thing' } })
    fireEvent.click(within(byHand).getByRole('button', { name: 'Add to wishlist' }))
    await act(async () => {})
    expect(state.added.at(-1)).toMatchObject({ title: 'An Unpublished Thing', wish: true })
  })

  it('By hand takes a price and a link, and refuses a bad one', async () => {
    const state = setup()
    const byHand = screen.getByText('By hand').parentElement as HTMLDetailsElement
    byHand.open = true
    const title = within(byHand).getByLabelText('Title *')
    fireEvent.change(title, { target: { value: 'A Pre-order' } })
    fireEvent.change(within(byHand).getByLabelText('What will it cost? (euros)'), { target: { value: '19,99' } })
    fireEvent.change(within(byHand).getByLabelText('Where to buy it'), { target: { value: 'not a link' } })
    fireEvent.click(within(byHand).getByRole('button', { name: 'Add to wishlist' }))
    await act(async () => {})
    expect(state.added).toEqual([])
    expect(within(byHand).getByText('Only links that start with https:// or http:// can be opened here.')).toBeTruthy()
    fireEvent.change(within(byHand).getByLabelText('Where to buy it'), { target: { value: 'https://shop.example/x' } })
    fireEvent.click(within(byHand).getByRole('button', { name: 'Add to wishlist' }))
    await act(async () => {})
    expect(state.added.at(-1)).toMatchObject({ title: 'A Pre-order', wish: true, price: 19.99, buyUrl: 'https://shop.example/x' })
  })
})
