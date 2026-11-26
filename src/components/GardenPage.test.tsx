import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { PLANT_KINDS, PLANT_KIND_IDS } from '#/lib/garden/plants'
import { SPOTS_PER_BED } from '#/lib/garden/numbers'
import { weatherChip, weatherOf } from '#/lib/garden/weather'

// no server: signed out, every server function mocked like the other page tests
vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
  loadChallenges: async () => [],
  saveChallenges: async () => [],
}))
vi.mock('#/server/favourites', () => ({ loadFavourites: async () => ({ kept: false }), saveFavourites: async () => ({ kept: false }) }))
vi.mock('#/server/creatures', () => ({ loadCreatures: async () => ({ kept: false }), saveCreatures: async () => ({ kept: false }) }))

const { GardenPage } = await import('./GardenPage')
const { GardenCard } = await import('./GardenCard')
const { CreaturesProvider } = await import('./creatures/CreaturesContext')
const { useGarden } = await import('./garden/useGarden')
const { PlantShape } = await import('./garden/plantSvg')

/**
 * The Garden tab and its block (T-0061 Done when 2, T-0063, T-0065): a plant
 * for every finished book, none for one she put aside, one for a re-read, the
 * night-blooming mark, moving a plant (an occupied spot swaps), the garden
 * items and the empty garden. happy-dom has no WebGL, so the flat drawing is
 * what every test sees — which is exactly what her phone sees (D-0051 §4).
 */

const TODAY = '2026-09-15'
const LOG_KEY = 'hannas-reading-list:creatures:local'

let next = 0
const book = (over: Partial<Book> = {}): Book => ({
  id: `b${next++}`,
  title: `Book ${next}`,
  authors: [],
  color: '#333',
  status: 'read',
  addedAt: next,
  ...over,
})
const finished = (day: string, over: Partial<Book> = {}): Book => book({ finished: [day], readingLog: { [day]: 0.4 }, ...over })

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  localStorage.clear()
  next = 0
})
afterEach(cleanup)

const tab = (books: Book[]) =>
  render(
    <CreaturesProvider accountId={null}>
      <GardenPage books={books} />
    </CreaturesProvider>,
  )

function Block({ books }: { books: Book[] }) {
  const { garden } = useGarden(books)
  return <GardenCard garden={garden} onOpen={() => {}} />
}

const savedLog = (): Array<Record<string, unknown>> => JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
const plantButton = (title: string) => screen.getByRole('button', { name: new RegExp(`· ${title} ·`) })

describe('the Garden tab', () => {
  it('shows one plant for every finished book', () => {
    const { container } = tab([
      finished('2026-03-02', { title: 'Spring book', genres: ['Romance'], pages: 300 }),
      finished('2026-04-05', { title: 'Oak book', genres: ['Fantasy'], pages: 700 }),
    ])
    expect(screen.getByRole('heading', { level: 1, name: 'Garden' })).toBeTruthy()
    expect(plantButton('Spring book').getAttribute('aria-label')).toContain('Rose')
    expect(plantButton('Oak book').getAttribute('aria-label')).toContain('Oak')
    expect(container.querySelector('.garden-total')!.textContent).toBe('2 plants')
  })

  it('shows no plant for a book she put aside without finishing', () => {
    tab([finished('2026-03-02', { title: 'Finished' }), book({ title: 'Put aside', status: 'dnf', progress: 0.3 })])
    expect(plantButton('Finished')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Put aside/ })).toBeNull()
  })

  it('shows one plant, bigger, for a book she has read twice', () => {
    tab([finished('2026-03-02', { title: 'Again', finished: ['2026-03-02', '2026-06-02'], readCount: 2 })])
    const label = plantButton('Again').getAttribute('aria-label')!
    expect(label).toContain('read 2 times')
    expect(screen.getByText('1 plant')).toBeTruthy()
  })

  it('marks a sleep read as night-blooming', () => {
    tab([finished('2026-03-02', { title: 'Night book', sleepRead: true })])
    expect(plantButton('Night book').getAttribute('aria-label')).toContain('night-blooming')
  })

  it('says the season and describes the garden for a screen reader', () => {
    const { container } = tab([finished('2026-03-02', { title: 'A book' })])
    // the chip in the head, and the one in "Have a look" that switches to it
    expect(screen.getAllByText(/🍂 Autumn/)).not.toHaveLength(0)
    // the sentence now says the day's weather too (D-0083 §1)
    expect(container.textContent).toContain('Your 2026 garden in autumn, with ')
  })

  it('shows the empty-garden line when nothing is finished', () => {
    tab([book({ status: 'reading' })])
    expect(screen.getByText('Finish a book and the first plant appears.')).toBeTruthy()
    expect(screen.queryByRole('group', { name: /Bed 1/ })).toBeNull()
  })

  it('draws the garden flat, with no WebGL', () => {
    const { container } = tab([finished('2026-03-02')])
    expect(container.querySelector('svg.garden-svg')).toBeTruthy()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('gives a button to every plant and to nothing else', () => {
    tab([finished('2026-03-02', { title: 'Only one' })])
    const bed = screen.getByRole('group', { name: 'Bed 1 of 1' })
    expect(within(bed).getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Empty spot/ })).toBeNull()
  })

  it('opens a chip per reading year and switches between the gardens', () => {
    tab([finished('2026-03-02', { title: 'This year' }), finished('2024-03-02', { title: 'Older' })])
    expect(plantButton('This year')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '2024' }))
    expect(plantButton('Older')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /This year/ })).toBeNull()
  })
})

describe('the cover behind a plant (D-0071 §3)', () => {
  it('shows the cover and the book when she presses a plant, and closes again', () => {
    tab([finished('2026-03-02', { title: 'Peek at me' })])
    fireEvent.click(plantButton('Peek at me'))
    const peek = screen.getByRole('group', { name: 'Peek at me' })
    expect(within(peek).getByText('Peek at me')).toBeTruthy()
    fireEvent.click(within(peek).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('group', { name: 'Peek at me' })).toBeNull()
  })

  it('opens and closes with the keyboard, and Escape closes it', () => {
    tab([finished('2026-03-02', { title: 'Keys' })])
    fireEvent.keyDown(plantButton('Keys'), { key: 'Enter' })
    expect(screen.getByRole('group', { name: 'Keys' })).toBeTruthy()
    fireEvent.keyDown(plantButton('Keys'), { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Keys' })).toBeNull()
  })

  it('never saves anything: a plant cannot be moved', () => {
    tab([finished('2026-03-02', { title: 'Fixed' }), finished('2026-03-03', { title: 'Also fixed' })])
    fireEvent.click(plantButton('Fixed'))
    fireEvent.click(plantButton('Also fixed'))
    expect(savedLog()).toHaveLength(0)
  })

  it('stands the plants in the order she finished the books', () => {
    tab([finished('2026-03-03', { title: 'Second' }), finished('2026-03-02', { title: 'First' })])
    expect(plantButton('First').getAttribute('data-spot')).toBe('0:0')
    expect(plantButton('Second').getAttribute('data-spot')).toBe('0:1')
  })
})

describe('garden items', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => finished(`2026-01-${String((i % 28) + 1).padStart(2, '0')}`))

  it('shows a locked item with what it takes, and will not place it', () => {
    tab(many(3))
    const pond = screen.getByText('Pond · at 25 books')
    expect(pond.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(pond)
    expect(savedLog()).toHaveLength(0)
  })

  it('places an unlocked item and takes it away again', () => {
    tab(many(12))
    fireEvent.click(screen.getByRole('button', { name: 'Bench' }))
    expect(savedLog()[0]).toMatchObject({ kind: 'place', key: 'g:i:2026:bench', slot: 0 })
    const placed = screen.getByRole('button', { name: 'Bench · Take away' })
    expect(placed.getAttribute('aria-pressed')).toBe('true')
    // a moment later, so the two choices on the same key are not in the same millisecond
    vi.setSystemTime(new Date(`${TODAY}T12:00:01`))
    fireEvent.click(placed)
    // placing and taking away share one key, and only the newest choice per key is kept (D-0034 §1)
    expect(savedLog()).toHaveLength(1)
    expect(savedLog()[0]).toMatchObject({ key: 'g:i:2026:bench', off: 1 })
    expect(screen.getByRole('button', { name: 'Bench' })).toBeTruthy()
  })

  it('says what is next to unlock', () => {
    tab(many(19))
    expect(screen.getByText('Next: a seed tray at 20 books (1 to go)')).toBeTruthy()
  })
})

describe('the dashboard block', () => {
  it('shows this year’s garden, the counts, the season and the next unlock', () => {
    render(
      <CreaturesProvider accountId={null}>
        <Block books={[finished('2026-03-02', { title: 'A book' })]} />
      </CreaturesProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Garden' })).toBeTruthy()
    expect(screen.getByText(/1 plant · \d+ in bloom/)).toBeTruthy()
    // the block says the season and the day's weather side by side (D-0083 §1)
    expect(screen.getByText(/🍂 Autumn · /)).toBeTruthy()
    expect(screen.getByText(/Next: a path at 5 books/)).toBeTruthy()
  })

  it('keeps out of the way when nothing is finished', () => {
    const { container } = render(
      <CreaturesProvider accountId={null}>
        <Block books={[book({ status: 'reading' })]} />
      </CreaturesProvider>,
    )
    expect(container.querySelector('.garden-block')).toBeNull()
  })
})

describe('every kind in the catalogue can be drawn', () => {
  it('draws a plant for each of the sixteen kinds, in every season', () => {
    // one book per kind is not possible from genres alone, so each kind's drawing is checked here
    for (const id of PLANT_KIND_IDS) {
      for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
        for (const stage of ['sprout', 'grown'] as const) {
          const plant = {
            id,
            book: book(),
            kind: PLANT_KINDS[id],
            year: 2026,
            reads: 1,
            growth: stage === 'sprout' ? 0 : 1,
            stage,
            scale: 1,
            night: false,
            blooming: true,
            bed: 0,
            spot: 0,
            placed: false,
          }
          const { container, unmount } = render(
            <svg>
              <PlantShape plant={plant} season={season} />
            </svg>,
          )
          expect(container.querySelector('svg')!.childNodes.length, `${id} ${season} ${stage}`).toBeGreaterThan(0)
          unmount()
        }
      }
    }
  })
})

describe('the flat garden stays light (D-0051 §6)', () => {
  it('draws a garden of 114 plants in a few hundred SVG shapes, with no canvas', () => {
    const books = Array.from({ length: 114 }, (_, i) =>
      finished(`2026-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`, {
        genres: [['Fantasy', 'Romance', 'Thriller', 'Poetry', 'Non-fiction'][i % 5]],
        pages: 90 + (i % 5) * 150,
      }),
    )
    const { container } = tab(books)
    const shapes = container.querySelectorAll('svg.garden-svg *').length
    const buttons = container.querySelectorAll('.garden-spot').length
    // eslint-disable-next-line no-console
    console.log(`the flat garden with 114 plants: ${shapes} SVG shapes, ${buttons} spot buttons, 0 canvases`)
    expect(container.querySelector('canvas')).toBeNull()
    expect(shapes).toBeLessThan(1200)
    expect(buttons).toBe(114)
  })
})

describe('reduce motion and the seasons in the tab', () => {
  it('holds the visitors still when the device asks for less motion', () => {
    const real = window.matchMedia
    // a device that asks for reduce motion (and is not a phone)
    window.matchMedia = ((q: string) =>
      ({
        matches: q.includes('prefers-reduced-motion'),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia
    try {
      const books = Array.from({ length: 20 }, (_, i) => finished(`2026-0${(i % 8) + 1}-10`, { genres: ['Romance'], pages: 300 }))
      const { container } = tab(books)
      const visitors = container.querySelectorAll('.garden-visitor')
      expect(visitors.length).toBeGreaterThan(0)
      for (const v of visitors) expect(v.classList.contains('still')).toBe(true)
    } finally {
      window.matchMedia = real
    }
  })

  it('names the season of the day the device is on', () => {
    for (const [day, chip] of [
      ['2026-04-15', '🌸 Spring'],
      ['2026-07-15', '☀️ Summer'],
      ['2026-10-15', '🍂 Autumn'],
      ['2026-12-15', '❄️ Winter'],
    ] as const) {
      vi.setSystemTime(new Date(`${day}T12:00:00`))
      const view = tab([finished('2026-01-02', { title: 'A book' })])
      expect(screen.getAllByText(new RegExp(chip)).length, day).toBeGreaterThan(0)
      view.unmount()
    }
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
  })
})

describe('a more alive garden (D-0083)', () => {
  it('shows the day’s weather beside the season, and the same weather every time', () => {
    const books = [finished('2026-03-02', { title: 'A book' })]
    const view = tab(books)
    const chip = weatherChip(weatherOf(TODAY))
    expect(screen.getAllByText(new RegExp(chip.slice(chip.indexOf(' ') + 1))).length).toBeGreaterThan(0)
    view.unmount()
    tab(books)
    expect(screen.getAllByText(new RegExp(chip.slice(chip.indexOf(' ') + 1))).length).toBeGreaterThan(0)
  })

  it('offers a look at another weather, which saves nothing', () => {
    tab([finished('2026-03-02', { title: 'A book' })])
    fireEvent.click(within(screen.getByRole('group', { name: 'Have a look at the weather' })).getByText('🌫️ Mist'))
    expect(screen.getByText(/Looking at .*mist/i)).toBeTruthy()
    expect(savedLog()).toEqual([])
    fireEvent.click(screen.getByText('Now'))
    expect(screen.queryByText(/Looking at/)).toBeNull()
  })

  it('says what scenery is on its way, and never as something she must do', () => {
    tab([finished('2026-03-02', { title: 'A book' })])
    expect(screen.getByText(/Next to arrive: a hedge, after 2 more books/)).toBeTruthy()
  })

  it('brings the scenery itself once enough books are finished', () => {
    const { container } = tab(Array.from({ length: 4 }, (_, i) => finished(`2026-03-0${i + 1}`, { title: `Book ${i}` })))
    expect(container.querySelector('.garden-scenery')).toBeTruthy()
  })

  it('offers three small kindnesses, and says plainly that none of them is needed', () => {
    tab([finished('2026-03-02', { title: 'A book' })])
    expect(screen.getByText('Nothing here needs doing. They are just nice to do.')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Small kindnesses' })).getAllByRole('button')).toHaveLength(3)
  })

  it('saves one place event with a g:k: key when she waters, and then says it is done', () => {
    tab([finished('2026-03-02', { title: 'A book' })])
    fireEvent.click(screen.getByText('💧 Water a plant'))
    const log = savedLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ kind: 'place', key: 'g:k:water', day: TODAY })
    expect(screen.getByText('💧 Watered today')).toBeTruthy()
  })

  it('saves nothing more when the same kindness is done again the same day', () => {
    tab([finished('2026-03-02', { title: 'A book' })])
    fireEvent.click(screen.getByText('🌾 Scatter seed'))
    fireEvent.click(screen.getByText('🌾 Seed scattered today'))
    expect(savedLog()).toHaveLength(1)
  })
})
