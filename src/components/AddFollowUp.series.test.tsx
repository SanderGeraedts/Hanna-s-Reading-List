import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import type { SeriesGuess } from '#/lib/seriesGuess'
import { AddFollowUp } from './AddFollowUp'
import type { FollowUpHandle } from './AddFollowUp'

afterEach(cleanup)

const added = (extra: Partial<Book> = {}): Book => ({
  id: 'b1',
  title: "Percy Jackson and the Titan's Curse",
  authors: ['Rick Riordan'],
  color: '#884422',
  status: 'want',
  addedAt: 1,
  ...extra,
})

const GUESSES: SeriesGuess[] = [
  { name: 'Percy Jackson', index: 3, from: 'title' },
  { name: 'Camp Half-Blood', from: 'author' },
]

function setup({
  initial = {},
  from = 'search',
  guesses = GUESSES,
  askSeries = true,
}: { initial?: Partial<Book>; from?: string; guesses?: SeriesGuess[]; askSeries?: boolean } = {}) {
  const state = { book: added(initial), patches: [] as Array<Partial<Book>>, done: 0 }
  const handle = createRef<FollowUpHandle>()
  function Harness() {
    const [book, setBook] = useState(state.book)
    const [open, setOpen] = useState(true)
    if (!open) return null
    return (
      <AddFollowUp
        book={book}
        from={from}
        handle={handle}
        askSeries={askSeries}
        seriesGuesses={guesses}
        onUpdate={(_id, patch) => {
          state.patches.push(patch)
          state.book = { ...state.book, ...patch }
          setBook(state.book)
        }}
        onDone={() => {
          state.done++
          setOpen(false)
        }}
      />
    )
  }
  render(<Harness />)
  return { state, handle }
}

const btn = (name: string | RegExp) => screen.getByRole('button', { name })
const seriesField = () => screen.queryByLabelText('Series name') as HTMLInputElement | null
const price = () => screen.queryByLabelText('What did it cost? (euros)') as HTMLInputElement | null
const chips = () => screen.getByRole('group', { name: 'Part of a series?' })

describe('the "Part of a series?" step after adding (T-0060)', () => {
  it('comes after How I have it, with the guesses as chips, best first', () => {
    const { state } = setup()
    expect(seriesField()).toBeNull()
    expect(btn('Next')).toBeTruthy()
    fireEvent.click(btn('Next'))
    expect(screen.getByText('Part of a series?')).toBeTruthy()
    expect(
      [...chips().querySelectorAll('button')].map((b) => b.textContent),
    ).toEqual(['Percy Jackson', 'Camp Half-Blood'])
    expect(seriesField()!.value).toBe('')
    expect(state.done).toBe(0)
  })

  it('one tap on a chip fills the field, saves the series and its number, and never asks again', () => {
    const { state } = setup()
    fireEvent.click(btn('Next'))
    fireEvent.click(btn('Percy Jackson'))
    expect(seriesField()!.value).toBe('Percy Jackson')
    expect(btn('Percy Jackson').getAttribute('aria-pressed')).toBe('true')
    expect(btn('Camp Half-Blood').getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn('Done'))
    expect(state.patches.at(-1)).toEqual({ series: 'Percy Jackson', seriesIndex: 3, seriesAsked: true })
    expect(state.done).toBe(1)
  })

  it('tapping the pressed chip again clears it', () => {
    setup()
    fireEvent.click(btn('Next'))
    fireEvent.click(btn('Percy Jackson'))
    fireEvent.click(btn('Percy Jackson'))
    expect(seriesField()!.value).toBe('')
    expect(btn('Percy Jackson').getAttribute('aria-pressed')).toBe('false')
  })

  it('typing a name un-presses every chip and saves what she typed', () => {
    const { state } = setup()
    fireEvent.click(btn('Next'))
    fireEvent.click(btn('Percy Jackson'))
    fireEvent.change(seriesField()!, { target: { value: 'Heroes of Olympus' } })
    expect(btn('Percy Jackson').getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn('Done'))
    expect(state.patches.at(-1)).toEqual({ series: 'Heroes of Olympus', seriesAsked: true })
  })

  it('Enter in the field is Done', () => {
    const { state } = setup()
    fireEvent.click(btn('Next'))
    fireEvent.change(seriesField()!, { target: { value: 'Throne of Glass' } })
    fireEvent.keyDown(seriesField()!, { key: 'Enter' })
    expect(state.patches.at(-1)).toEqual({ series: 'Throne of Glass', seriesAsked: true })
    expect(state.done).toBe(1)
  })

  it('Skip remembers only that it was asked', () => {
    const { state } = setup()
    fireEvent.click(btn('Next'))
    fireEvent.click(btn('Skip'))
    expect(state.patches.at(-1)).toEqual({ seriesAsked: true })
    expect(state.done).toBe(1)
  })

  it('Done with nothing typed and no guess saves only that it was asked', () => {
    const { state } = setup({ guesses: [] })
    fireEvent.click(btn('Next'))
    // no chips at all: only the field
    expect(screen.queryByRole('group', { name: 'Part of a series?' })!.querySelectorAll('button')).toHaveLength(0)
    expect(seriesField()).toBeTruthy()
    fireEvent.click(btn('Done'))
    expect(state.patches.at(-1)).toEqual({ seriesAsked: true })
  })

  it('focus goes to the first guess, or to the field when there is none', () => {
    setup()
    fireEvent.click(btn('Next'))
    expect(document.activeElement).toBe(btn('Percy Jackson'))
    cleanup()
    setup({ guesses: [] })
    fireEvent.click(btn('Next'))
    expect(document.activeElement).toBe(seriesField())
  })

  it('a half-typed name is kept when the dialog closes early', () => {
    const { state, handle } = setup()
    fireEvent.click(btn('Next'))
    fireEvent.change(seriesField()!, { target: { value: 'Red Rising' } })
    handle.current!.flush()
    expect(state.book.series).toBe('Red Rising')
  })

  it('leaves D-0024’s order alone: price first, the e-book link last', () => {
    const { state } = setup({ initial: { formats: ['ebook'] } })
    // 1. how she has it, with the price
    expect(price()).not.toBeNull()
    fireEvent.change(price()!, { target: { value: '0' } })
    expect(btn('Next')).toBeTruthy()
    fireEvent.click(btn('Next'))
    // 2. the series
    expect(seriesField()).toBeTruthy()
    expect(btn('Next')).toBeTruthy()
    fireEvent.click(btn('Next'))
    // 3. the free e-book's link
    expect(screen.getByLabelText('E-book link')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('E-book link'), { target: { value: 'https://drive.example/x' } })
    fireEvent.click(btn('Done'))
    expect(state.book.price).toBe(0)
    expect(state.book.seriesAsked).toBe(true)
    expect(state.book.ebookUrl).toBe('https://drive.example/x')
  })

  it('is not asked at all when the task says not to (a batch, an import)', () => {
    const { state } = setup({ askSeries: false })
    expect(btn('Done').textContent).toBe('Done')
    fireEvent.click(btn('Done'))
    expect(state.done).toBe(1)
    expect(state.patches.some((p) => 'seriesAsked' in p)).toBe(false)
  })
})
