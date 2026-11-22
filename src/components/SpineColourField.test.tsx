import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import type { CoverAnalysis } from '#/lib/cover'
import { colorFromString } from '#/lib/cover'
import { SpineColourField } from './SpineColourField'

const analyzeCover = vi.hoisted(() => vi.fn<(url: string) => Promise<CoverAnalysis | null>>())
vi.mock('#/lib/cover', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/cover')>()),
  analyzeCover,
}))

const ANALYSIS: CoverAnalysis = {
  color: '#7a2e2e',
  aspect: 0.66,
  palette: ['#7a2e2e', '#2e4a7a', '#d1d100', '#72564d'],
}

function book(patch: Partial<Book>): Book {
  return { id: 'b1', title: 'Dune', author: 'Frank Herbert', status: 'want', color: '#7a2e2e', ...patch } as Book
}

/** the row as BookPanel uses it, keeping the book in state like the shelf does */
async function setup(initial: Book) {
  const state = { updates: [] as string[], faces: [] as string[] }
  function Harness() {
    const [b, setB] = useState(initial)
    return (
      <SpineColourField
        book={b}
        onChange={(color) => {
          state.updates.push(color)
          setB({ ...b, color })
        }}
        onFace={(face) => state.faces.push(face)}
      />
    )
  }
  render(<Harness />)
  await act(async () => {}) // let the (mocked) analysis resolve
  const group = screen.getByRole('group', { name: 'Spine colour' })
  const swatches = () => within(group).queryAllByRole('button').filter((b) => b.classList.contains('spine-swatch'))
  return { state, group, swatches }
}

const pressed = (els: HTMLElement[]) => els.filter((e) => e.getAttribute('aria-pressed') === 'true')

afterEach(cleanup)
beforeEach(() => {
  analyzeCover.mockReset()
  analyzeCover.mockResolvedValue(ANALYSIS)
})

describe('Spine colour row (T-0019)', () => {
  const withCover = { coverUrl: '/api/cover/id/1?size=L' }

  it('shows the cover’s swatches, the first named dominant, ✓ on the current colour', async () => {
    const { swatches, group } = await setup(book({ ...withCover, color: '#2E4A7A' }))
    expect(analyzeCover).toHaveBeenCalledWith('/api/cover/id/1?size=L')
    const s = swatches()
    expect(s).toHaveLength(4)
    expect(s[0].getAttribute('aria-label')).toBe('Red, dominant')
    expect(within(group).getByText('Dominant')).toBeTruthy()
    expect(pressed(s)).toEqual([s[1]])
    expect(s[1].textContent).toBe('✓')
    expect(s[0].textContent).toBe('')
  })

  it('shows a current colour outside the palette as an extra ✓ swatch at the end', async () => {
    const { swatches } = await setup(book({ ...withCover, color: '#a0522d' }))
    const s = swatches()
    expect(s).toHaveLength(5)
    expect(pressed(s)).toEqual([s[4]])
    expect(s[4].classList.contains('outside')).toBe(true)
  })

  it('tapping a swatch saves that colour and turns the book to its spine', async () => {
    const { swatches, state } = await setup(book(withCover))
    fireEvent.click(swatches()[2])
    expect(state.updates).toEqual(['#d1d100'])
    expect(state.faces).toEqual(['spine'])
    expect(pressed(swatches())).toEqual([swatches()[2]])
  })

  it('tapping the current swatch does nothing', async () => {
    const { swatches, state } = await setup(book(withCover))
    fireEvent.click(swatches()[0])
    expect(state.updates).toEqual([])
  })

  it('Back to automatic is hidden on the automatic colour, and otherwise gives it back with focus on the pressed swatch', async () => {
    const { swatches, state, group } = await setup(book(withCover))
    expect(within(group).queryByRole('button', { name: 'Back to automatic' })).toBeNull()
    fireEvent.click(swatches()[1])
    const back = within(group).getByRole('button', { name: 'Back to automatic' })
    fireEvent.click(back)
    expect(state.updates).toEqual(['#2e4a7a', '#7a2e2e'])
    expect(within(group).queryByRole('button', { name: 'Back to automatic' })).toBeNull()
    expect(document.activeElement).toBe(swatches()[0])
  })

  it('a book without a cover shows one ✓ swatch, and Back to automatic gives the title’s colour', async () => {
    const { swatches, state, group } = await setup(book({ color: '#123456' }))
    expect(analyzeCover).not.toHaveBeenCalled()
    const s = swatches()
    expect(s).toHaveLength(1)
    expect(pressed(s)).toEqual(s)
    expect(within(group).queryByText('Dominant')).toBeNull()
    fireEvent.click(within(group).getByRole('button', { name: 'Back to automatic' }))
    expect(state.updates).toEqual([colorFromString('Dune')])
    expect(document.activeElement).toBe(swatches()[0])
  })

  it('a cover that can’t be read shows one ✓ swatch and no Back to automatic', async () => {
    analyzeCover.mockResolvedValue(null)
    const { swatches, group } = await setup(book({ ...withCover, color: '#123456' }))
    expect(swatches()).toHaveLength(1)
    expect(pressed(swatches())).toHaveLength(1)
    expect(within(group).queryByRole('button', { name: 'Back to automatic' })).toBeNull()
    expect(within(group).queryByText('Dominant')).toBeNull()
  })

  it('while the cover is analysed, only the current colour shows', async () => {
    analyzeCover.mockReturnValue(new Promise(() => {}))
    const { swatches, group } = await setup(book({ ...withCover, color: '#2e4a7a' }))
    expect(swatches()).toHaveLength(1)
    expect(within(group).queryByRole('button', { name: 'Back to automatic' })).toBeNull()
  })

  it('every swatch is a button with a plain, unique colour name', async () => {
    const { swatches } = await setup(book({ ...withCover, color: '#7d3030' }))
    const names = swatches().map((s) => s.getAttribute('aria-label'))
    expect(swatches().every((s) => s.tagName === 'BUTTON')).toBe(true)
    expect(names.every((n) => n && !/#/.test(n))).toBe(true)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(['Red, dominant', 'Blue', 'Yellow', 'Brown', 'Red 2'])
  })
})
