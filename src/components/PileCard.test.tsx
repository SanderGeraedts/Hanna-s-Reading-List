import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
}))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { PileCard } = await import('./DashboardExtras')
const { compareHeight, comparisonText, heightSpoken, heightText, pileHeight } = await import('#/lib/pileHeight')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A finished book, so the pace line shows. */
const finished = book('done', { status: 'read', finished: [daysAgo(10)], pages: 300 })

/** The paragraph with the height (or audiobooks) line, if there is one. */
const heightLine = (container: HTMLElement) =>
  [...container.querySelectorAll('p')].find((p) => /Stacked up|all audiobooks/.test(p.textContent ?? ''))

/** What she sees: the line without the screen-reader-only text. */
const seen = (p: HTMLElement) => {
  const copy = p.cloneNode(true) as HTMLElement
  copy.querySelectorAll('.visually-hidden').forEach((s) => s.remove())
  return copy.textContent
}

/** What a screen reader hears: without the aria-hidden parts. */
const heard = (p: HTMLElement) => {
  const copy = p.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"]').forEach((s) => s.remove())
  return copy.textContent
}

afterEach(cleanup)

describe('PileCard: how tall the pile would stand (T-0021)', () => {
  it('shows the height and comparison under the pages line and before the pace line', () => {
    const shelf = [
      finished,
      ...Array.from({ length: 47 }, (_, i) => book(`w${i}`, { pages: 300, format: 'paperback' })),
      book('listen', { formats: ['storytel'], minutes: 600, pages: 600 }),
    ]
    const { container } = render(<PileCard books={shelf} />)
    const h = pileHeight(shelf)
    expect(h.counted).toBe(47)
    const nb = ' '
    const line = heightLine(container)!
    expect(line).toBeTruthy()
    expect(seen(line)).toBe(
      `📚${nb}Stacked up, your pile would be ${heightText(h.metres, nb)}: ${comparisonText(compareHeight(h.metres), nb)}.`,
    )
    expect(heard(line)).toBe(
      `Stacked up, your pile would be ${heightSpoken(h.metres)}: about as tall as an adult (1.75 metres).`,
    )
    expect(line.className).toBe('')

    // the rest of the block, in order
    expect(screen.getByText('waiting')).toBeTruthy()
    const paras = [...container.querySelectorAll('p')]
    const pages = paras.findIndex((p) => /pages · 10 h to listen/.test(p.textContent ?? ''))
    const pace = paras.findIndex((p) => /At your pace of/.test(p.textContent ?? ''))
    const at = paras.indexOf(line)
    expect(pages).toBeGreaterThanOrEqual(0)
    expect(at).toBe(pages + 1)
    expect(pace).toBe(at + 1)
    expect(screen.getByText('Last 6 months')).toBeTruthy()
  })

  it('shows no height line for an empty pile', () => {
    const { container } = render(<PileCard books={[finished]} />)
    expect(container.querySelector('.big-number')?.textContent).toBe('0 books waiting')
    expect(heightLine(container)).toBeUndefined()
    expect(screen.getByText('Last 6 months')).toBeTruthy()
  })

  it('shows the audiobooks line for a pile of only listen-only books', () => {
    const shelf = [book('a', { formats: ['storytel'], minutes: 500 }), book('b', { formats: ['audiobook'], minutes: 300 })]
    const { container } = render(<PileCard books={shelf} />)
    const line = heightLine(container)!
    expect(seen(line)).toBe('🎧 Your pile is all audiobooks, so it takes up no room at all.')
    expect(heard(line)).toBe('Your pile is all audiobooks, so it takes up no room at all.')
    expect(container.textContent).toContain('2 books waiting')
    expect(screen.getByText(/to listen/)).toBeTruthy()
    expect(screen.getByText(/Finished on/)).toBeTruthy()
  })
})

describe('PileCard: height line edge cases (tester, T-0021)', () => {
  it('a pile of 1 book: seen and heard in centimetres, with the mug line', () => {
    const { container } = render(<PileCard books={[finished, book('one', { pages: 400, format: 'paperback' })]} />)
    const line = heightLine(container)!
    expect(seen(line)).toBe('📚 Stacked up, your pile would be 4 cm: not as tall as a mug (10 cm) yet.')
    expect(heard(line)).toBe('Stacked up, your pile would be 4 centimetres: not as tall as a mug (10 centimetres) yet.')
    expect(container.textContent).toContain('1 book waiting')
  })

  it('mixed formats: only the listen-only book is left out, and no extra note is shown', () => {
    const shelf = [
      finished,
      book('e', { formats: ['ebook'], pages: 300 }),
      book('p', { formats: ['paperback', 'storytel'], pages: 300, minutes: 600 }),
      book('n'),
      book('l', { formats: ['storytel'], minutes: 6000 }),
    ]
    const { container } = render(<PileCard books={shelf} />)
    const h = pileHeight(shelf)
    expect(h).toMatchObject({ counted: 3, listenOnly: 1 })
    const line = heightLine(container)!
    // e-book + paper/Storytel book (300 pages each) + a book without pages (280): about 10.2 cm
    expect(h.metres).toBeCloseTo(0.102, 10)
    expect(heard(line)).toBe('Stacked up, your pile would be 10 centimetres: about as tall as a mug (10 centimetres).')
    expect(line.textContent).not.toMatch(/audiobook/)
    expect(container.textContent).toContain('4 books waiting')
  })

  it('a very large pile shows whole metres with a thousands comma and the Eiffel Tower', () => {
    const shelf = Array.from({ length: 30_000 }, (_, i) => book(`b${i}`, { pages: 300 }))
    const { container } = render(<PileCard books={shelf} />)
    const line = heightLine(container)!
    expect(seen(line)).toBe('📚 Stacked up, your pile would be 1,035 m: taller than the Eiffel Tower (330 m).')
    expect(heard(line)).toBe('Stacked up, your pile would be 1,035 metres: taller than the Eiffel Tower (330 metres).')
  })
})
