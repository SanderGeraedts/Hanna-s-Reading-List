import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LAYOUT, type BlockId } from '#/lib/dashboardLayout'

// no server: the dashboard signed out, its server functions mocked like the other dashboard tests
vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
  loadChallenges: async () => [],
  saveChallenges: async () => [],
}))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
  browseBooks: async () => [],
  lookupIsbn: async () => null,
  getPublishDate: async () => null,
  getCoverChoices: async () => [],
}))
const favouritesServer = vi.hoisted(() => ({ calls: 0 }))
vi.mock('#/server/favourites', () => ({
  loadFavourites: async () => (favouritesServer.calls++, { kept: false }),
  saveFavourites: async () => (favouritesServer.calls++, { kept: false }),
}))

const { Dashboard } = await import('./Dashboard')

/**
 * Moving blocks within ★ Favourites in Arrange (T-0020): a handle on each
 * Favourites copy, arrow keys that change only the Favourites order, and focus
 * that stays on the moved block's handle. Two columns (happy-dom is wider than
 * the narrow breakpoint).
 */

const KEY = 'hannas-reading-list:dashboard:local'
const FOUR: BlockId[] = ['goal', 'reading', 'calendar', 'pace']
const saved = () => JSON.parse(localStorage.getItem(KEY)!)

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(KEY, JSON.stringify({ ...DEFAULT_LAYOUT, favourites: FOUR }))
  favouritesServer.calls = 0
})
afterEach(cleanup)

const show = () => render(<Dashboard books={[]} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />)
const favourites = () => screen.getByRole('region', { name: '★ Favourites' })
const handle = (name: string) =>
  within(favourites()).getByRole('button', {
    name: `Move ${name} within the favourites: drag it, or use the arrow keys`,
  })
const arrange = () => fireEvent.click(screen.getByRole('button', { name: 'Arrange' }))

describe('moving within Favourites in Arrange (T-0020)', () => {
  it('outside Arrange there are no handles; in Arrange each favourite has one and no Hide', () => {
    show()
    expect(within(favourites()).queryAllByRole('button', { name: /within the favourites/ })).toHaveLength(0)
    arrange()
    const handles = within(favourites()).getAllByRole('button', { name: /within the favourites/ })
    expect(handles).toHaveLength(4)
    for (const h of handles) expect(h.getAttribute('title')).toBe('Drag to move')
    expect(within(favourites()).queryAllByRole('button', { name: /^Hide / })).toHaveLength(0)
    // tools: handle first, then the star
    const tools = handle('Reading goal').parentElement!
    expect([...tools.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))).toEqual([
      'Move Reading goal within the favourites: drag it, or use the arrow keys',
      'Take Reading goal out of the favourites',
    ])
    // the sections keep their own handle, which still says Shift
    expect(screen.getAllByRole('button', { name: /^Move Reading goal: drag it/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryAllByRole('button', { name: /within the favourites/ })).toHaveLength(0)
  })

  it("arrow keys change the Favourites order and not the section's", () => {
    show()
    arrange()
    const sections = structuredClone(saved().sections)
    fireEvent.keyDown(handle('Reading goal'), { key: 'ArrowDown' })
    expect(saved().favourites).toEqual(['reading', 'calendar', 'goal', 'pace'])
    expect(saved().sections).toEqual(sections)
    expect(saved().hidden).toEqual([])
    expect(within(favourites()).getByRole('status').textContent).toBe('Reading goal: left column, row 2 of the favourites.')
    fireEvent.keyDown(handle('Finish by'), { key: 'ArrowUp' })
    expect(saved().favourites).toEqual(['reading', 'pace', 'calendar', 'goal'])
    expect(saved().sections).toEqual(sections)
    // signed out: nothing is asked of the server
    expect(favouritesServer.calls).toBe(0)
  })

  it('Shift + arrows and keys at an edge do nothing, and the key is not swallowed', () => {
    show()
    arrange()
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
      const event = new KeyboardEvent('keydown', { key, shiftKey: true, bubbles: true, cancelable: true })
      act(() => void handle('Calendar').dispatchEvent(event))
      expect(event.defaultPrevented).toBe(false)
    }
    expect(saved().favourites).toEqual(FOUR)
    const edge = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
    act(() => void handle('Reading goal').dispatchEvent(edge))
    expect(edge.defaultPrevented).toBe(false)
    expect(saved().favourites).toEqual(FOUR)
    expect(within(favourites()).getByRole('status').textContent).toBe('')
  })

  it('focus stays on the moved block’s handle after Left/Right, also when it changes column', () => {
    show()
    arrange()
    handle('Reading goal').focus()
    fireEvent.keyDown(handle('Reading goal'), { key: 'ArrowRight' })
    expect(saved().favourites).toEqual(['reading', 'goal', 'calendar', 'pace'])
    expect(document.activeElement).toBe(handle('Reading goal'))
    expect(within(favourites()).getByRole('status').textContent).toBe('Reading goal: right column, row 1 of the favourites.')
    fireEvent.keyDown(handle('Reading goal'), { key: 'ArrowLeft' })
    expect(saved().favourites).toEqual(FOUR)
    expect(document.activeElement).toBe(handle('Reading goal'))
    fireEvent.keyDown(handle('Reading goal'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(handle('Reading goal'))
  })

  it('a key move in a section leaves the Favourites order alone', () => {
    show()
    arrange()
    fireEvent.keyDown(screen.getByRole('button', { name: /^Move Reading goal: drag it/ }), { key: 'ArrowDown' })
    expect(saved().favourites).toEqual(FOUR)
    expect(saved().sections.challenges).not.toEqual(DEFAULT_LAYOUT.sections.challenges)
  })

  it('with no favourites only the empty note shows in Arrange', () => {
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_LAYOUT))
    show()
    arrange()
    expect(within(favourites()).getByText('Star blocks with ☆ to see them here, on top.')).toBeTruthy()
    expect(within(favourites()).queryAllByRole('button', { name: /within the favourites/ })).toHaveLength(0)
    expect(within(favourites()).getByRole('status').textContent).toBe('')
  })
})
