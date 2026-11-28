import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { suggestedName } from '#/lib/creatures/creature'
import { CREATURES_START, SUGGESTED_NAMES, WELCOME_EGG } from '#/lib/creatures/numbers'
import { addDays } from '#/lib/creatures/days'

// no server: signed out, every server function mocked like the other dashboard tests
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
vi.mock('#/server/favourites', () => ({ loadFavourites: async () => ({ kept: false }), saveFavourites: async () => ({ kept: false }) }))
vi.mock('#/server/creatures', () => ({ loadCreatures: async () => ({ kept: false }), saveCreatures: async () => ({ kept: false }) }))

const { CreaturesPage } = await import('./CreaturesPage')
const { CreaturesCard } = await import('./CreaturesCard')
const { CreaturesProvider, useCreatures } = await import('./creatures/CreaturesContext')
const { Dashboard } = await import('./Dashboard')

/**
 * The Creatures tab, the dashboard block and Waiting for you (T-0029 Done
 * when 2, 6, 7, 9, 11): the welcome flow, feeding, renaming, and that the tab
 * and the block always agree. happy-dom has no WebGL, so the den is left out
 * (as on a device without it) and the hatch goes straight to the name step.
 */

// relative to the go-live day, so moving CREATURES_START to the merge day needs no change here
const TODAY = addDays(CREATURES_START, 2)
const LOG_KEY = 'hannas-reading-list:creatures:local'
// 20 % of 300 pages = 60 pages = 90 minutes = 18 cookies, today
const BOOKS: Book[] = [
  { id: 'b1', title: 'The Hobbit', authors: ['J. R. R. Tolkien'], color: '#333', status: 'reading', addedAt: 0, pages: 300, readingLog: { [TODAY]: 0.2 } },
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

const tab = (books = BOOKS, startChoose = false) =>
  render(
    <CreaturesProvider accountId={null}>
      <CreaturesPage books={books} startChoose={startChoose} />
    </CreaturesProvider>,
  )

function Block({ books }: { books: Book[] }) {
  const { c, feed } = useCreatures(books)
  return <CreaturesCard c={c} onFeed={feed} onOpen={() => {}} onHatch={() => {}} />
}

const savedLog = () => JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
const hatchSaved = (species = 'cat', name?: string) => {
  const log: unknown[] = [{ id: 'hatch-1', at: new Date(`${TODAY}T08:00:00`).getTime(), kind: 'hatch', egg: WELCOME_EGG, species }]
  if (name) log.push({ id: 'name-1', at: new Date(`${TODAY}T08:01:00`).getTime(), kind: 'name', key: WELCOME_EGG, name })
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
}

describe('the welcome flow', () => {
  it('shows the egg with Hatch, then the five commons to choose from', () => {
    tab()
    expect(screen.getByRole('heading', { name: 'A welcome egg' })).toBeTruthy()
    // the cookie pill shows what she has earned so far, and no Feed yet
    expect(screen.getAllByText('18').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /^Feed/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hatch' }))
    const heading = screen.getByRole('heading', { name: 'Choose your first creature' })
    expect(document.activeElement).toBe(heading)
    const group = screen.getByRole('radiogroup', { name: 'Choose your first creature' })
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[]
    expect(radios.map((r) => r.closest('label')!.textContent)).toEqual([
      'House cat',
      'Red fox',
      'Capybara',
      'Eurasian red squirrel',
      'Adélie penguin',
    ])
    expect(radios.every((r) => !r.checked)).toBe(true)
    expect((screen.getByRole('button', { name: 'Hatch' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(radios[1])
    expect((screen.getByRole('button', { name: 'Hatch the red fox' }) as HTMLButtonElement).disabled).toBe(false)
    expect(savedLog()).toEqual([])
  })

  it('Not yet goes back to the egg without saving anything, focus on Hatch', () => {
    tab(BOOKS, true)
    fireEvent.click(screen.getAllByRole('radio')[2])
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }))
    expect(screen.getByRole('heading', { name: 'A welcome egg' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hatch' }))
    expect(savedLog()).toEqual([])
  })

  it('Escape in the choose step is Not yet', () => {
    tab(BOOKS, true)
    fireEvent.keyDown(screen.getAllByRole('radio')[0], { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'A welcome egg' })).toBeTruthy()
  })

  it('saves the hatch on the tap, suggests a name, 🎲 gives another, and an empty name is not saved', () => {
    tab(BOOKS, true)
    fireEvent.click(screen.getAllByRole('radio')[0])
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the house cat' }))
    // saved before the name step (a reload mid-crack never loses it)
    expect(savedLog()).toMatchObject([{ kind: 'hatch', egg: WELCOME_EGG, species: 'cat' }])
    expect(screen.getByRole('status').textContent).toMatch(/^Your house cat hatched!/)
    const hello = screen.getByRole('heading', { name: 'Say hello to your house cat!' })
    expect(document.activeElement).toBe(hello)
    const field = screen.getByLabelText('Name') as HTMLInputElement
    const first = suggestedName('cat', WELCOME_EGG)
    expect(field.value).toBe(first)
    fireEvent.click(screen.getByRole('button', { name: 'Another name' }))
    expect(field.value).toBe(suggestedName('cat', WELCOME_EGG, 1))
    expect(field.value).not.toBe(first)
    expect(SUGGESTED_NAMES.cat).toContain(field.value)
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: "That's the one!" }))
    expect(screen.getByText('Give your creature a name.')).toBeTruthy()
    expect(savedLog()).toHaveLength(1)
    fireEvent.change(field, { target: { value: 'Biscuit' } })
    fireEvent.click(screen.getByRole('button', { name: "That's the one!" }))
    expect(savedLog()).toMatchObject([{ kind: 'hatch' }, { kind: 'name', key: WELCOME_EGG, name: 'Biscuit' }])
    const name = screen.getByRole('heading', { name: 'Biscuit' })
    expect(document.activeElement).toBe(name)
    // the hatch can't be repeated
    expect(screen.queryByRole('heading', { name: 'A welcome egg' })).toBeNull()
  })

  it('keeps the first suggestion without saving a name choice', () => {
    tab(BOOKS, true)
    fireEvent.click(screen.getAllByRole('radio')[3])
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the red squirrel' }))
    fireEvent.click(screen.getByRole('button', { name: "That's the one!" }))
    expect(savedLog().map((e: { kind: string }) => e.kind)).toEqual(['hatch'])
    expect(screen.getByRole('heading', { name: suggestedName('red-squirrel', WELCOME_EGG) })).toBeTruthy()
  })

  it('says “Your creatures arrive soon.” before the start day', () => {
    vi.setSystemTime(new Date(`${addDays(CREATURES_START, -3)}T12:00:00`))
    try {
      tab()
      expect(screen.getByText('Your creatures arrive soon.')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Hatch' })).toBeNull()
    } finally {
      vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    }
  })
})

describe('focus after the hatch (tester, Done when 11)', () => {
  /** like a browser: select() on an input also moves focus there (jsdom/happy-dom's doesn't) */
  function browserSelect() {
    const original = HTMLInputElement.prototype.select
    const calls: string[] = []
    const spy = vi.spyOn(HTMLInputElement.prototype, 'select').mockImplementation(function (this: HTMLInputElement) {
      calls.push(this.id)
      this.focus()
      original.call(this)
    })
    return { calls, restore: () => spy.mockRestore() }
  }

  it('stays on "Say hello to your …!": the Name field selects nothing and takes no focus by itself', () => {
    const sel = browserSelect()
    try {
      tab(BOOKS, true)
      fireEvent.click(screen.getAllByRole('radio')[2])
      fireEvent.click(screen.getByRole('button', { name: 'Hatch the capybara' }))
      expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Say hello to your capybara!' }))
      expect(sel.calls).toEqual([])
      // 🎲 from the keyboard keeps focus on 🎲
      const dice = screen.getByRole('button', { name: 'Another name' })
      dice.focus()
      fireEvent.click(dice)
      expect(document.activeElement).toBe(dice)
      // coming into the field selects the whole name, once
      const field = screen.getByLabelText('Name') as HTMLInputElement
      fireEvent.focus(field)
      expect(sel.calls).toEqual(['hello-name'])
    } finally {
      sel.restore()
    }
  })

  it('Rename still puts focus in the field with the name selected', () => {
    hatchSaved('cat', 'Biscuit')
    const sel = browserSelect()
    try {
      tab()
      fireEvent.click(screen.getByRole('button', { name: 'Rename Biscuit' }))
      expect(document.activeElement).toBe(screen.getByLabelText('Name'))
      expect(sel.calls).toEqual(['rename-name'])
    } finally {
      sel.restore()
    }
  })
})

describe('the home', () => {
  it('feeds 5 cookies: the balance goes down, growth goes up, and it is announced', () => {
    hatchSaved('cat', 'Biscuit')
    tab()
    const card = screen.getByRole('region', { name: 'Biscuit' })
    // growth 3 from today's reading
    expect(within(card).getByRole('progressbar').getAttribute('aria-valuetext')).toBe('3 of 20 to level 2')
    expect(within(card).getByText('Level 1 · Baby')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Feed Biscuit 5 cookies' }))
    expect(within(card).getByRole('progressbar').getAttribute('aria-valuetext')).toBe('8 of 20 to level 2')
    expect(screen.getByRole('status').textContent).toBe('Biscuit ate 5 cookies. 13 cookies left.')
    expect(savedLog().filter((e: { kind: string }) => e.kind === 'feed')).toMatchObject([{ amount: 5, pet: WELCOME_EGG }])
  })

  it('feeds what is left when fewer than 5, and Feed is disabled (but focusable) at 0', () => {
    // 2 % of 300 pages = 9 minutes = 1 cookie
    const books = [{ ...BOOKS[0], readingLog: { [TODAY]: 0.02 } }]
    hatchSaved('cat', 'Biscuit')
    tab(books)
    const feed = screen.getByRole('button', { name: 'Feed Biscuit 1 cookie' })
    expect(feed.textContent).toContain('Feed 1')
    fireEvent.click(feed)
    const empty = screen.getByRole('button', { name: 'Feed Biscuit 5 cookies' })
    expect(empty.getAttribute('aria-disabled')).toBe('true')
    expect((empty as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(empty)
    expect(savedLog().filter((e: { kind: string }) => e.kind === 'feed')).toHaveLength(1)
  })

  it('shows a negative balance as “−4”, with Feed disabled', () => {
    hatchSaved('cat', 'Biscuit')
    const log = savedLog()
    log.push({ id: 'feed-x', at: new Date(`${TODAY}T09:00:00`).getTime(), kind: 'feed', pet: WELCOME_EGG, amount: 22 })
    localStorage.setItem(LOG_KEY, JSON.stringify(log))
    tab()
    expect(screen.getAllByText('−4').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Feed Biscuit 5 cookies' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('renames, and the name stays after a reload; Escape cancels', () => {
    hatchSaved('cat', 'Biscuit')
    const view = tab()
    fireEvent.click(screen.getByRole('button', { name: 'Rename Biscuit' }))
    const field = screen.getByLabelText('Name') as HTMLInputElement
    expect(field.value).toBe('Biscuit')
    fireEvent.change(field, { target: { value: 'Mochi' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(screen.getByRole('heading', { name: 'Mochi' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Renamed to Mochi.')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Mochi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Rename Mochi' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Nope' } })
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Mochi' })).toBeTruthy()
    view.unmount()
    tab()
    expect(screen.getByRole('heading', { name: 'Mochi' })).toBeTruthy()
  })

  it('lists this week with its minutes and cookies', () => {
    hatchSaved('cat', 'Biscuit')
    tab()
    expect(screen.getByRole('heading', { name: 'This week · +18 🍪' })).toBeTruthy()
    expect(screen.getByText('Today')).toBeTruthy()
    expect(screen.getByText('1 h 30 min')).toBeTruthy()
    expect(screen.getByText('+18 🍪')).toBeTruthy()
  })
})

describe('the tab and the block agree', () => {
  it('show the same name, level, growth and balance, before and after a Feed in either', () => {
    hatchSaved('cat', 'Biscuit')
    render(
      <CreaturesProvider accountId={null}>
        <CreaturesPage books={BOOKS} />
        <Block books={BOOKS} />
      </CreaturesProvider>,
    )
    const card = screen.getByRole('region', { name: 'Biscuit' })
    const block = screen.getByRole('region', { name: 'Creatures' })
    const read = (el: HTMLElement) => ({
      level: within(el).getByText(/^Level \d+ · /).textContent,
      growth: within(el).getByRole('progressbar').getAttribute('aria-valuetext'),
      pill: el.querySelector('.cookie-pill')!.textContent,
    })
    expect(read(block)).toEqual(read(card))
    fireEvent.click(within(block).getByRole('button', { name: 'Feed Biscuit 5 cookies' }))
    expect(read(block)).toEqual(read(card))
    expect(read(card).pill).toContain('13')
    fireEvent.click(within(card).getByRole('button', { name: 'Feed Biscuit 5 cookies' }))
    expect(read(block)).toEqual(read(card))
    expect(read(card).pill).toContain('8')
    expect(within(block).getByText('Biscuit')).toBeTruthy()
  })
})

describe('Waiting for you and the dashboard block', () => {
  const dash = (onOpenCreatures = vi.fn()) => {
    render(
      <CreaturesProvider accountId={null}>
        <Dashboard books={BOOKS} onShowBook={() => {}} accountId={null} onUpdate={() => {}} onOpenCreatures={onOpenCreatures} />
      </CreaturesProvider>,
    )
    return onOpenCreatures
  }

  it('shows the welcome egg until it is hatched; Hatch goes to the tab at choosing', () => {
    const open = dash()
    const waiting = screen.getByRole('region', { name: 'Waiting for you' })
    expect(within(waiting).getByText('A welcome egg is waiting for you!')).toBeTruthy()
    fireEvent.click(within(waiting).getByRole('button', { name: 'Hatch' }))
    expect(open).toHaveBeenCalledWith('choose')
    // the Creatures block left the dashboard for Today in your world (T-0124)
    expect(screen.queryByRole('region', { name: 'Creatures' })).toBeNull()
  })

  it('has no egg line once hatched', () => {
    hatchSaved('cat', 'Biscuit')
    dash()
    expect(screen.queryByText('A welcome egg is waiting for you!')).toBeNull()
  })

  it('shows only the newest level-up, once, until Nice! on this device', () => {
    hatchSaved('cat', 'Biscuit')
    // a lot of reading over a week: 7 reading days and plenty of cookies fed
    const days = Array.from({ length: 7 }, (_, i) => addDays(TODAY, i - 6))
    const books = [{ ...BOOKS[0], pages: 3000, readingLog: Object.fromEntries(days.map((d) => [d, 0.05])) }]
    const log = savedLog()
    log[0].at = new Date(`${CREATURES_START}T08:00:00`).getTime()
    log.push({ id: 'feed-big', at: new Date(`${TODAY}T09:00:00`).getTime(), kind: 'feed', pet: WELCOME_EGG, amount: 60 })
    localStorage.setItem(LOG_KEY, JSON.stringify(log))
    render(
      <CreaturesProvider accountId={null}>
        <Dashboard books={books} onShowBook={() => {}} accountId={null} onUpdate={() => {}} onOpenCreatures={() => {}} />
      </CreaturesProvider>,
    )
    // growth 60 + 3 × 3 reading days since the hatch = 69: level 3 (20 + 25 = 45, next 30)
    const waiting = screen.getByRole('region', { name: 'Waiting for you' })
    const lines = within(waiting).getAllByText(/Biscuit/)
    expect(lines.map((l) => l.textContent)).toEqual(['Biscuit reached level 3!'])
    fireEvent.click(within(within(waiting).getByText('Biscuit reached level 3!').closest('li')!).getByRole('button', { name: 'Nice!' }))
    expect(screen.queryByText('Biscuit reached level 3!')).toBeNull()
    cleanup()
    render(
      <CreaturesProvider accountId={null}>
        <Dashboard books={books} onShowBook={() => {}} accountId={null} onUpdate={() => {}} />
      </CreaturesProvider>,
    )
    expect(screen.queryByText('Biscuit reached level 3!')).toBeNull()
  })

  it('never puts a mood in Waiting for you', () => {
    hatchSaved('cat', 'Biscuit')
    const log = savedLog()
    log[0].at = new Date(`${addDays(TODAY, -7)}T08:00:00`).getTime()
    localStorage.setItem(LOG_KEY, JSON.stringify(log))
    act(() => void dash())
    expect(screen.queryByText(/misses you/, { selector: '.waiting-card *' })).toBeNull()
  })
})
