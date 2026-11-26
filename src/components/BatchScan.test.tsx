import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book, NewBook } from '#/lib/library'
import type { CoverAnalysis } from '#/lib/cover'
import type { IsbnLookup } from '#/server/openLibrary'

/**
 * The camera is **stubbed**, never asked for: `BarcodeScanner` is replaced by a
 * stand-in that hands the test its `onIsbn`, so a scan is a function call. No
 * hardware, no permission prompt, no `BarcodeDetector`.
 */
const camera = vi.hoisted(() => ({ emit: null as null | ((isbn: string) => void), paused: false }))
vi.mock('./BarcodeScanner', () => ({
  canScanBarcodes: () => true,
  BarcodeScanner: ({ onIsbn, paused }: { onIsbn: (isbn: string) => void; paused?: boolean }) => {
    camera.emit = onIsbn
    camera.paused = !!paused
    return createElement('div', { 'data-testid': 'camera', 'data-paused': paused ? 'yes' : 'no' })
  },
}))

const analyzeCover = vi.hoisted(() => vi.fn<(url: string) => Promise<CoverAnalysis | null>>())
vi.mock('#/lib/cover', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/cover')>()),
  analyzeCover,
}))
vi.mock('#/server/openLibrary', () => ({ lookupIsbn: async () => null }))

const { BatchScan } = await import('./BatchScan')

const ANALYSIS: CoverAnalysis = { color: '#7a2e2e', aspect: 0.66, palette: ['#7a2e2e'] }

const NIGHT = '9780099554790'
const CIRCE = '9781408890052'
const ATLAS = '9781529095241'
const TRESS = '9781399613392'
const PIRANESI = '9781526622426'
const WISHED = '9780008501822'
const UNKNOWN = '9781234567897'

const TITLES: Record<string, string> = {
  [NIGHT]: 'The Night Circus',
  [CIRCE]: 'Circe',
  [ATLAS]: 'The Atlas Six',
  [TRESS]: 'Tress of the Emerald Sea',
}

const library: Book[] = [
  { id: 'p', title: 'Piranesi', authors: ['Susanna Clarke'], color: '#333', status: 'want', addedAt: 1, isbn: PIRANESI },
  { id: 'w', title: 'Babel', authors: ['R. F. Kuang'], color: '#333', status: 'want', addedAt: 2, isbn: WISHED, wish: true },
]

const lookup = async (isbn: string): Promise<IsbnLookup | null> => {
  if (isbn === 'boom') throw new Error('offline')
  const title = TITLES[isbn]
  return title ? { workKey: `/works/OL${isbn.slice(-4)}W`, title, authors: ['Someone'], isbn, genres: [], coverId: 7 } : null
}

function setup(opts: { lookup?: typeof lookup; mode?: 'shelf' | 'wish' } = {}) {
  const state = { added: [] as NewBook[], manual: [] as string[], closed: 0 }
  render(
    <BatchScan
      existing={library}
      lookup={opts.lookup ?? lookup}
      onAdd={(b) => state.added.push(b)}
      onManual={(isbn) => state.manual.push(isbn)}
      onClose={() => state.closed++}
      mode={opts.mode}
    />,
  )
  return state
}

/** one barcode through the stubbed camera, with its lookup settled */
async function scan(isbn: string) {
  await act(async () => {
    camera.emit!(isbn)
  })
}

const rows = () => screen.queryAllByRole('listitem')
const rowFor = (title: string) => rows().find((li) => li.querySelector('strong')?.textContent === title)!
/** opens a row's own How I have it chips */
const openRow = (title: string) =>
  fireEvent.click(within(rowFor(title)).getByRole('button', { name: new RegExp('^How I have ' + title) }))
const addAll = () => screen.getByRole('button', { name: /^Add all/ })
const live = () => screen.getByText((_, el) => el?.getAttribute('aria-live') === 'polite')

afterEach(cleanup)
beforeEach(() => {
  camera.emit = null
  analyzeCover.mockReset()
  analyzeCover.mockResolvedValue(ANALYSIS)
})

describe('scanning a pile of books in one go (T-0071)', () => {
  it('keeps the camera running and shows a row per book', async () => {
    setup()
    await scan(NIGHT)
    await scan(CIRCE)
    await scan(ATLAS)
    expect(screen.getByTestId('camera').getAttribute('data-paused')).toBe('no')
    expect(rows()).toHaveLength(3)
    expect(rows().map((li) => li.querySelector('strong')?.textContent)).toEqual([
      'The Atlas Six',
      'Circe',
      'The Night Circus',
    ])
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('3 books')
    expect(addAll().textContent).toBe('Add all 3 books')
  })

  it('the pile’s How I have it sets every row she has not changed herself', async () => {
    setup()
    await scan(NIGHT)
    await scan(CIRCE)
    const pile = screen.getByRole('group', { name: 'How I have it' })
    expect(within(pile).getByRole('button', { name: 'Paperback' }).getAttribute('aria-pressed')).toBe('true')
    // a row says how it is had with its chips shut
    expect(screen.getByRole('button', { name: 'How I have Circe: Paperback' })).toBeTruthy()
    // her own choice on one row, after opening that row's chips
    openRow('Circe')
    fireEvent.click(within(rowFor('Circe')).getByRole('button', { name: 'E-book — Circe' }))
    fireEvent.click(within(rowFor('Circe')).getByRole('button', { name: 'Paperback — Circe' }))
    expect(screen.getByRole('button', { name: 'How I have Circe: E-book' })).toBeTruthy()
    // the pile changes to Hardcover
    fireEvent.click(within(pile).getByRole('button', { name: 'Paperback' }))
    fireEvent.click(within(pile).getByRole('button', { name: 'Hardcover' }))
    openRow('The Night Circus')
    expect(
      within(rowFor('The Night Circus')).getByRole('button', { name: 'Hardcover — The Night Circus' }).getAttribute('aria-pressed'),
    ).toBe('true')
    // the row she set herself keeps what she set
    openRow('Circe')
    expect(within(rowFor('Circe')).getByRole('button', { name: 'E-book — Circe' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(rowFor('Circe')).getByRole('button', { name: 'Hardcover — Circe' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('opens one row’s chips at a time, and says so to a screen reader', async () => {
    setup()
    await scan(NIGHT)
    await scan(CIRCE)
    const summary = (title: string) => within(rowFor(title)).getByRole('button', { name: new RegExp(`^How I have ${title}`) })
    expect(summary('Circe').getAttribute('aria-expanded')).toBe('false')
    openRow('Circe')
    expect(summary('Circe').getAttribute('aria-expanded')).toBe('true')
    openRow('The Night Circus')
    expect(summary('Circe').getAttribute('aria-expanded')).toBe('false')
    expect(summary('The Night Circus').getAttribute('aria-expanded')).toBe('true')
  })

  it('shows a price field per row only for a bought format, and clears it when that goes (D-0024)', async () => {
    setup()
    await scan(NIGHT)
    const row = () => within(rowFor('The Night Circus'))
    const field = () => row().queryByLabelText('Price of The Night Circus, in euros') as HTMLInputElement | null
    expect(field()).not.toBeNull()
    fireEvent.change(field()!, { target: { value: '12.50' } })
    openRow('The Night Circus')
    // unticking the last bought format takes the field, and what was in it, away
    fireEvent.click(row().getByRole('button', { name: 'Paperback — The Night Circus' }))
    expect(field()).toBeNull()
    fireEvent.click(row().getByRole('button', { name: 'From the library — The Night Circus' }))
    expect(field()).toBeNull()
    fireEvent.click(row().getByRole('button', { name: 'Hardcover — The Night Circus' }))
    expect(field()!.value).toBe('')
  })

  it('a price that is not a price blocks the whole add and takes focus to that field', async () => {
    const state = setup()
    await scan(NIGHT)
    await scan(CIRCE)
    const field = within(rowFor('Circe')).getByLabelText('Price of Circe, in euros') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'twelve' } })
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(state.added).toEqual([])
    expect(within(rowFor('Circe')).getByText('Try 12.50 or 12,50.')).toBeTruthy()
    expect(document.activeElement).toBe(field)
  })

  it('Add all puts every addable row on the shelf, with its formats and its price', async () => {
    const state = setup()
    await scan(NIGHT)
    await scan(CIRCE)
    await scan(ATLAS)
    await scan(TRESS)
    fireEvent.change(within(rowFor('Circe')).getByLabelText('Price of Circe, in euros'), { target: { value: '22,50' } })
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(state.added).toHaveLength(4)
    expect(state.added.map((b) => b.title).sort()).toEqual(
      ['Circe', 'The Atlas Six', 'The Night Circus', 'Tress of the Emerald Sea'].sort(),
    )
    for (const b of state.added) expect(b.formats).toEqual(['paperback'])
    expect(state.added.find((b) => b.title === 'Circe')!.price).toBe(22.5)
    expect(state.added.find((b) => b.title === 'The Night Circus')!.price).toBeUndefined()
    // the covers came along
    expect(state.added.every((b) => b.coverUrl === '/api/cover/id/7?size=L')).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('Added 4 books.')
  })

  it('counts a book already on her shelf or her wishlist, and adds neither', async () => {
    const state = setup()
    await scan(PIRANESI)
    await scan(WISHED)
    expect(within(rowFor('Piranesi')).getByText('On shelf')).toBeTruthy()
    expect(within(rowFor('Babel')).getByText('On your wishlist')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Nothing to add yet')
    expect(addAll().textContent).toBe('Add all')
    expect(addAll().hasAttribute('disabled')).toBe(true)
    expect(state.added).toEqual([])
  })

  it('an ISBN Open Library does not know keeps its number and offers the Manual tab', async () => {
    const state = setup()
    await scan(UNKNOWN)
    const row = rows()[0]
    expect(row.querySelector('strong')?.textContent).toBe(UNKNOWN)
    expect(within(row).getByText('Not found')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'Add it by hand' }))
    expect(state.manual).toEqual([UNKNOWN])
  })

  it('a lookup that fails can be tried again', async () => {
    let fail = true
    setup({
      lookup: async (isbn) => {
        if (fail) throw new Error('offline')
        return lookup(isbn)
      },
    })
    await scan(NIGHT)
    expect(rows()[0].querySelector('strong')?.textContent).toBe(NIGHT)
    fail = false
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    })
    expect(rows()[0].querySelector('strong')?.textContent).toBe('The Night Circus')
  })

  it('the same book scanned twice is one row', async () => {
    setup()
    await scan(NIGHT)
    await scan(NIGHT)
    await scan('0099554798') // the same book as an ISBN-10
    expect(rows()).toHaveLength(1)
    expect(live().textContent).toBe('Already in the list: The Night Circus')
  })

  it('announces each scan once, through one live region', async () => {
    setup()
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1)
    await scan(NIGHT)
    expect(live().textContent).toBe('Added to the list: The Night Circus')
    await scan(PIRANESI)
    expect(live().textContent).toBe('Already on your shelf: Piranesi')
    await scan(UNKNOWN)
    expect(live().textContent).toBe(`Not found: ${UNKNOWN}`)
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1)
  })

  it('twenty books all land in the list and all go on the shelf', async () => {
    const many: Record<string, string> = {}
    for (let i = 0; i < 20; i++) many[`978${1000000000 + i * 1000}`] = `Book ${i}`
    const state = setup({
      lookup: async (isbn) =>
        many[isbn] ? { workKey: `/works/OL${i(isbn)}W`, title: many[isbn], authors: ['A'], isbn, genres: [] } : null,
    })
    for (const isbn of Object.keys(many)) await scan(isbn)
    expect(rows()).toHaveLength(20)
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(state.added).toHaveLength(20)
    expect(new Set(state.added.map((b) => b.title)).size).toBe(20)
  })

  it('every row can be taken off, and scanning it again puts it back', async () => {
    setup()
    await scan(NIGHT)
    fireEvent.click(screen.getByRole('button', { name: 'Remove The Night Circus from the list' }))
    expect(rows()).toEqual([])
    await scan(NIGHT)
    expect(rows()).toHaveLength(1)
  })

  it('Add all is dead while there is nothing to add', async () => {
    setup()
    expect(addAll().hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Nothing to add yet')
  })

  it('after Add all, Scan more empties the list and Done closes the dialog', async () => {
    const state = setup()
    await scan(NIGHT)
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(document.activeElement).toBe(screen.getByRole('status'))
    fireEvent.click(screen.getByRole('button', { name: 'Scan more' }))
    expect(rows()).toEqual([])
    expect(screen.getByTestId('camera')).toBeTruthy()
    await scan(NIGHT)
    await act(async () => {
      fireEvent.click(addAll())
    })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(state.closed).toBe(1)
  })
})

const i = (isbn: string) => isbn.slice(-4)

/**
 * Scanning onto the **wishlist** (D-0082): standing in a bookshop with a book she
 * wants to read but isn't buying today.
 */
describe('scanning onto the wishlist', () => {
  it('adds what it scans as a wish, not as a book on the shelf', async () => {
    const state = setup({ mode: 'wish' })
    await scan(NIGHT)
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(state.added).toHaveLength(1)
    expect(state.added[0].title).toBe('The Night Circus')
    expect(state.added[0].wish).toBe(true)
    // a wish is not owned, so it is never given a format
    expect(state.added[0].formats).toBeUndefined()
  })

  it('never asks how she has it, because she hasn’t', async () => {
    setup({ mode: 'wish' })
    await scan(NIGHT)
    expect(screen.queryByRole('group', { name: 'How I have it' })).toBeNull()
  })

  it('says where the books are going, before and after', async () => {
    setup({ mode: 'wish' })
    await scan(NIGHT)
    expect(addAll().textContent).toContain('to the wishlist')
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(screen.getByRole('status').textContent).toBe('Added 1 book to your wishlist.')
  })

  it('still puts books on the shelf when it is not in wishlist mode', async () => {
    const state = setup()
    await scan(NIGHT)
    await act(async () => {
      fireEvent.click(addAll())
    })
    expect(state.added[0].wish).toBeUndefined()
    expect(screen.getByRole('status').textContent).toBe('Added 1 book.')
  })
})
