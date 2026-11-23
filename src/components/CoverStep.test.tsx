import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoverAnalysis } from '#/lib/cover'
import { colorFromString } from '#/lib/cover'
import type { SearchResult } from '#/server/openLibrary'

const analyzeCover = vi.hoisted(() => vi.fn<(url: string) => Promise<CoverAnalysis | null>>())
const getCoverChoices = vi.hoisted(() => vi.fn<() => Promise<number[]>>())
vi.mock('#/lib/cover', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#/lib/cover')>()),
  analyzeCover,
}))
vi.mock('#/server/openLibrary', () => ({ getCoverChoices: () => getCoverChoices() }))

const { CoverStep } = await import('./CoverStep')

const ANALYSIS: CoverAnalysis = { color: '#7a2e2e', aspect: 0.66, palette: ['#7a2e2e'] }

const result = (extra: Partial<SearchResult> = {}): SearchResult => ({
  workKey: '/works/OL45804W',
  title: 'The Night Circus',
  authors: ['Erin Morgenstern'],
  coverId: 11,
  ...extra,
})

async function setup(r: SearchResult = result()) {
  const state = { added: [] as Array<Record<string, unknown>>, back: 0 }
  render(
    <CoverStep
      result={r}
      onAdd={(cover) => {
        state.added.push({ ...cover })
      }}
      onBack={() => {
        state.back++
      }}
    />,
  )
  await act(async () => {})
  return state
}

const tiles = () => screen.queryAllByRole('radio')
const primary = () => screen.getByRole('button', { name: /^(Add this one|Add without a cover|Add to wishlist)$/ })

afterEach(cleanup)
beforeEach(() => {
  analyzeCover.mockReset()
  analyzeCover.mockResolvedValue(ANALYSIS)
  getCoverChoices.mockReset()
  getCoverChoices.mockResolvedValue([11, 12, 13])
})

describe('picking the cover before the book is added (T-0060)', () => {
  it('heads the step with the book she tapped and lists every edition’s cover', async () => {
    await setup()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('The Night Circus')
    expect(screen.getByText('Erin Morgenstern')).toBeTruthy()
    expect(tiles()).toHaveLength(3)
    expect(tiles().map((t) => t.getAttribute('aria-label'))).toEqual([
      'Cover 1 of 3',
      'Cover 2 of 3',
      'Cover 3 of 3',
    ])
  })

  it('picks the first cover as soon as there is one, so the button is never dead', async () => {
    await setup()
    expect(tiles()[0].getAttribute('aria-checked')).toBe('true')
    expect(primary().hasAttribute('disabled')).toBe(false)
    // and that is the one the app would have taken before this task
    expect(tiles()[0].querySelector('img')?.getAttribute('src')).toBe('/api/cover/id/11?size=M')
  })

  it('adds nothing until she presses Add this one, and then exactly once', async () => {
    const state = await setup()
    expect(state.added).toEqual([])
    fireEvent.click(tiles()[1])
    expect(tiles()[1].getAttribute('aria-checked')).toBe('true')
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(state.added).toEqual([{ coverUrl: '/api/cover/id/12?size=L', coverAspect: 0.66, color: '#7a2e2e' }])
    expect(analyzeCover).toHaveBeenCalledWith('/api/cover/id/12?size=L')
  })

  it('a work with one edition shows that one cover and still adds', async () => {
    getCoverChoices.mockResolvedValue([11])
    const state = await setup()
    expect(tiles()).toHaveLength(1)
    expect(tiles()[0].getAttribute('aria-checked')).toBe('true')
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(state.added).toHaveLength(1)
  })

  it('a work with forty editions shows them all, in one scroll', async () => {
    getCoverChoices.mockResolvedValue(Array.from({ length: 36 }, (_, i) => 100 + i))
    await setup(result({ coverId: undefined }))
    expect(tiles()).toHaveLength(36)
  })

  it('no cover at all: the button says so, and the book keeps its colour from its title', async () => {
    getCoverChoices.mockResolvedValue([])
    const state = await setup(result({ coverId: undefined }))
    expect(tiles()).toEqual([])
    expect(screen.getByText('Open Library has no covers for this book.')).toBeTruthy()
    expect(primary().textContent).toBe('Add without a cover')
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(state.added).toEqual([{ color: colorFromString('The Night Circus') }])
    expect(analyzeCover).not.toHaveBeenCalled()
  })

  it('Open Library unreachable is the same quiet state, and the book can still be added', async () => {
    getCoverChoices.mockRejectedValue(new Error('offline'))
    const state = await setup(result({ coverId: undefined }))
    expect(screen.getByText('Open Library has no covers for this book.')).toBeTruthy()
    expect(screen.queryByText(/failed|error/i)).toBeNull()
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(state.added).toHaveLength(1)
  })

  it('a cover that will not load says so and adds nothing', async () => {
    analyzeCover.mockResolvedValue(null)
    const state = await setup()
    await act(async () => {
      fireEvent.click(primary())
    })
    expect(state.added).toEqual([])
    expect(screen.getByText('That picture could not be loaded. Try another one.')).toBeTruthy()
  })

  it('Back returns to the results with nothing added', async () => {
    const state = await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(state.back).toBe(1)
    expect(state.added).toEqual([])
  })

  it('is one radio group, and the arrow keys move through it', async () => {
    await setup()
    const group = screen.getByRole('radiogroup', { name: 'Cover' })
    expect(group).toBeTruthy()
    // only the picked tile is in the tab order
    expect(tiles().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(tiles()[1].getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(tiles()[2].getAttribute('aria-checked')).toBe('true')
    // at the end it stays at the end
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(tiles()[2].getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(group, { key: 'ArrowLeft' })
    expect(tiles()[1].getAttribute('aria-checked')).toBe('true')
  })

  it('focus lands on the picked tile once the covers are in', async () => {
    await setup()
    expect(document.activeElement).toBe(tiles()[0])
  })

  it('the wishlist’s cover step says Add to wishlist', async () => {
    render(<CoverStep result={result()} addLabel="Add to wishlist" onAdd={() => {}} onBack={() => {}} />)
    await act(async () => {})
    expect(screen.getAllByRole('button', { name: 'Add to wishlist' }).length).toBeGreaterThan(0)
  })
})
