import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { CREATURES_START, WELCOME_EGG } from '#/lib/creatures/numbers'
import { addDays } from '#/lib/creatures/days'

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
const { WaitingCard } = await import('./WaitingCard')

/**
 * Eggs, hatching, duplicates, shiny safety, release, Your pets and the album
 * in the Creatures tab (T-0030 Done when 1, 5–11). happy-dom has no WebGL, so
 * the den is left out and a hatch goes straight to the reveal.
 *
 * The demo world: her welcome cat Biscuit, and short books finished one a day
 * from the start. The book eggs hatch (fixed by their ids): 5 red squirrel,
 * 10 red squirrel (a duplicate), 15 red fox, 20 red fox (a shiny duplicate),
 * 25 polar bear (rare).
 */

const day = (n: number) => addDays(CREATURES_START, n)
const TODAY = day(26)
const LOG_KEY = 'hannas-reading-list:creatures:local'
const at = (d: string, time = '08:00') => new Date(`${d}T${time}:00`).getTime()

const BOOKS: Book[] = Array.from({ length: 25 }, (_, i) => ({
  id: `s${i + 1}`,
  title: `Book ${String.fromCharCode(65 + i)}`,
  authors: ['A. Writer'],
  color: '#333',
  status: 'read' as const,
  addedAt: 0,
  pages: 12,
  finished: [day(i + 1)],
}))

let n = 0
const ev = (e: Record<string, unknown>, when: number): Record<string, unknown> => ({ id: `ev-${n++}`, at: when, ...e })
const welcome = () => [
  ev({ kind: 'hatch', egg: WELCOME_EGG, species: 'cat' }, at(CREATURES_START)),
  ev({ kind: 'name', key: WELCOME_EGG, name: 'Biscuit' }, at(CREATURES_START, '08:01')),
]
/** hatches of book eggs 5..upTo, with choices for some */
const hatched = (upTo: number, choices: Record<number, Record<string, unknown>> = {}) =>
  Array.from({ length: upTo / 5 }, (_, i) => (i + 1) * 5).flatMap((k) => [
    ev({ kind: 'hatch', egg: `m:books-${k}` }, at(day(k + 1))),
    ...(choices[k] ? [ev({ kind: 'choose', egg: `m:books-${k}`, ...choices[k] }, at(day(k + 1), '08:01'))] : []),
  ])
const seed = (log: unknown[]) => localStorage.setItem(LOG_KEY, JSON.stringify(log))
const saved = () => JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]') as Array<Record<string, unknown>>
const status = () => document.querySelector('.creatures-page [role="status"]')!.textContent

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

const tab = (books = BOOKS, props: { startStep?: 'hatch' | 'duplicate' } = {}) =>
  render(
    <CreaturesProvider accountId={null}>
      <CreaturesPage books={books} {...props} />
    </CreaturesProvider>,
  )

describe('eggs (Done when 5)', () => {
  it('shows the oldest egg with its tier and reason, the rest under Then:, and hatches the oldest', () => {
    seed([...welcome(), ...hatched(15, { 10: { pick: 'keep' } })])
    tab()
    const card = screen.getByRole('heading', { name: 'Eggs' }).closest('section')!
    expect(within(card).getByText('A common egg')).toBeTruthy()
    expect(within(card).getByText('For your 20th book')).toBeTruthy()
    expect(within(card).getByText('Then:')).toBeTruthy()
    expect(within(card).getByText('a rare egg')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Hatch the common egg' }))
    // saved on the tap: a hatch for the oldest egg, with no species (it is derived)
    expect(saved().filter((e) => e.kind === 'hatch').at(-1)).toMatchObject({ egg: 'm:books-20' })
    expect(saved().filter((e) => e.kind === 'hatch').at(-1)!.species).toBeUndefined()
    // the 20th book's red fox is a shiny duplicate
    expect(screen.getByRole('heading', { name: 'Another red fox!' })).toBe(document.activeElement)
    expect(screen.getByText('✨ A shiny one!')).toBeTruthy()
    expect(status()).toBe("A common egg hatched: it's a red fox! A shiny one!")
  })

  it('a new species: "It\'s a polar bear!", New in your album!, and the name step', () => {
    seed([...welcome(), ...hatched(20, { 10: { pick: 'keep' } })])
    tab()
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the rare egg' }))
    expect(screen.getByRole('heading', { name: "It's a polar bear!" })).toBe(document.activeElement)
    expect(screen.getByText('New in your album!')).toBeTruthy()
    expect(status()).toBe("A rare egg hatched: it's a polar bear! New in your album!")
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Snowy' } })
    fireEvent.click(screen.getByRole('button', { name: "That's the one!" }))
    expect(saved().find((e) => e.kind === 'name' && e.key === 'm:books-25')).toMatchObject({ name: 'Snowy' })
    // back to the current pet; the new one doesn't become current; focus on the Eggs heading
    expect(screen.getByRole('heading', { name: 'Eggs' })).toBe(document.activeElement)
    expect(screen.getByRole('heading', { name: 'Biscuit', level: 2 })).toBeTruthy()
  })

  it('a Hatch elsewhere opens the tab hatching the oldest egg', () => {
    seed([...welcome(), ...hatched(20, { 10: { pick: 'keep' } })])
    tab(BOOKS, { startStep: 'hatch' })
    expect(screen.getByRole('heading', { name: "It's a polar bear!" })).toBeTruthy()
  })
})

describe('duplicates and shiny safety (Done when 7)', () => {
  it('offers Keep, Turn into 30 🍪 and Power up, and cookies add half the price', () => {
    seed([...welcome(), ...hatched(5)])
    tab()
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the common egg' }))
    expect(screen.getByRole('heading', { name: 'Another red squirrel!' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Keep as a new pet' })).toBeTruthy()
    const before = Number(document.querySelector('.creatures-head .cookie-pill')!.textContent!.replace(/\D/g, ''))
    expect(screen.getByRole('button', { name: /^Power up \w+ by 3 levels$/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Turn the red squirrel into 30 cookies' }))
    expect(saved().find((e) => e.kind === 'choose')).toMatchObject({ egg: 'm:books-10', pick: 'cookies' })
    const after = Number(document.querySelector('.creatures-head .cookie-pill')!.textContent!.replace(/\D/g, ''))
    expect(after - before).toBe(30)
    expect(status()).toBe('30 cookies added.')
  })

  it('a duplicate left undecided waits in the Eggs card with Choose', () => {
    seed([...welcome(), ...hatched(10)])
    tab()
    const card = screen.getByRole('heading', { name: 'Eggs' }).closest('section')!
    expect(within(card).getByText('Your new red squirrel is waiting')).toBeTruthy()
    fireEvent.click(within(card).getByRole('button', { name: 'Choose for your new red squirrel' }))
    expect(screen.getByRole('heading', { name: 'Another red squirrel!' })).toBe(document.activeElement)
  })

  it('with two of that species, asks "Which red squirrel?"', () => {
    seed([...welcome(), ...hatched(5), ev({ kind: 'hatch', egg: 'm:books-10' }, at(day(11))), ev({ kind: 'choose', egg: 'm:books-10', pick: 'keep' }, at(day(11), '08:01')), ...hatched(25, {}).filter((e) => !['m:books-5', 'm:books-10'].includes(e.egg as string))])
    const books = [...BOOKS, ...Array.from({ length: 5 }, (_, i) => ({ ...BOOKS[0], id: `x${i}`, finished: [day(26)] }))]
    tab(books)
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the common egg' }))
    fireEvent.click(screen.getByRole('button', { name: 'Power up a red squirrel (+3 levels)' }))
    const group = screen.getByRole('radiogroup', { name: 'Which red squirrel?' })
    expect(group).toBe(document.activeElement)
    expect(within(group).getAllByRole('radio').length).toBe(2)
    expect(screen.getByRole('button', { name: 'Power up' }).hasAttribute('disabled')).toBe(true)
  })

  it('on a shiny, cookies first warn with Keep it focused, and only a 2 s hold acts (mouse and keys)', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    try {
      seed([...welcome(), ...hatched(15, { 10: { pick: 'keep' } })])
      tab()
      fireEvent.click(screen.getByRole('button', { name: 'Hatch the common egg' }))
      fireEvent.click(screen.getByRole('button', { name: 'Turn the red fox into 30 cookies' }))
      // nothing saved yet: the warning, Keep it focused, and the hold button
      expect(saved().some((e) => e.kind === 'choose' && e.egg === 'm:books-20')).toBe(false)
      expect(screen.getByRole('group', { name: '✨ This is a shiny!' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Keep it' })).toBe(document.activeElement)
      const hold = screen.getByRole('button', { name: 'Hold to turn the shiny red fox into 30 cookies' })
      // a click or a short press does nothing
      fireEvent.click(hold)
      fireEvent.pointerDown(hold, { button: 0 })
      act(() => void vi.advanceTimersByTime(1500))
      fireEvent.pointerUp(hold)
      act(() => void vi.advanceTimersByTime(2000))
      // Space held too briefly, and key repeats, do nothing either
      fireEvent.keyDown(hold, { key: ' ' })
      act(() => void vi.advanceTimersByTime(1000))
      fireEvent.keyDown(hold, { key: ' ', repeat: true })
      fireEvent.keyUp(hold, { key: ' ' })
      act(() => void vi.advanceTimersByTime(3000))
      expect(saved().some((e) => e.kind === 'choose' && e.egg === 'm:books-20')).toBe(false)
      // Enter held for 2 s acts
      fireEvent.keyDown(hold, { key: 'Enter' })
      act(() => void vi.advanceTimersByTime(2000))
      expect(saved().filter((e) => e.kind === 'choose' && e.egg === 'm:books-20')).toEqual([expect.objectContaining({ pick: 'cookies', hold: 1 })])
      expect(status()).toBe('30 cookies added.')
    } finally {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    }
  })

  it('on a shiny, Escape and Keep it go back, and the shiny stays a pet', () => {
    seed([...welcome(), ...hatched(15, { 10: { pick: 'keep' } })])
    tab()
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the common egg' }))
    fireEvent.click(screen.getByRole('button', { name: /^Power up \w+ by 3 levels$/ }))
    expect(screen.getByText(/^Using it to power up \w+ can't be undone\.$/)).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Keep it' }), { key: 'Escape' })
    expect(screen.queryByRole('group', { name: '✨ This is a shiny!' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Keep as a new pet' })).toBeTruthy()
    // left without choosing: kept as a pet, no 🐣 waiting
    cleanup()
    tab()
    expect(screen.queryByText(/is waiting$/)).toBeNull()
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(5)
  })
})

describe('Your pets (Done when 9)', () => {
  it('shows from 2 pets as a radio group; picking makes it current at once and saves one event after arrowing', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    try {
      seed([...welcome(), ...hatched(15, { 10: { pick: 'cookies' } })])
      tab()
      const group = screen.getByRole('radiogroup', { name: 'Current pet' })
      const radios = within(group).getAllByRole('radio')
      expect(radios.length).toBe(3)
      fireEvent.click(radios[1])
      fireEvent.click(radios[2])
      expect(status()).toMatch(/ is your current pet\.$/)
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(`^${status()!.split(' ')[0]}`) })).toBeTruthy()
      expect(saved().some((e) => e.kind === 'current')).toBe(false)
      act(() => void vi.advanceTimersByTime(1100))
      expect(saved().filter((e) => e.kind === 'current')).toEqual([expect.objectContaining({ key: 'pet', pet: 'm:books-15' })])
    } finally {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    }
  })

  it('is not shown with one pet', () => {
    seed(welcome())
    tab()
    expect(screen.queryByRole('radiogroup', { name: 'Current pet' })).toBeNull()
  })

  // tester, sent back: un-skip with the fix. A pick announced as current must not be lost when
  // she leaves the tab (the page unmounts) before the 1 s save.
  it('keeps a pick when she leaves the tab within the second', () => {
    seed([...welcome(), ...hatched(15, { 10: { pick: 'cookies' } })])
    const { unmount } = tab()
    const radios = within(screen.getByRole('radiogroup', { name: 'Current pet' })).getAllByRole('radio')
    fireEvent.click(radios[2])
    expect(status()).toMatch(/ is your current pet\.$/)
    unmount()
    expect(saved().filter((e) => e.kind === 'current')).toEqual([expect.objectContaining({ key: 'pet', pet: 'm:books-15' })])
  })
})

describe('release (Done when 10)', () => {
  it('is disabled with one pet', () => {
    seed(welcome())
    tab()
    const btn = screen.getByRole('button', { name: 'Release…' })
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    expect(btn.getAttribute('title')).toBe('You always keep one pet.')
    fireEvent.click(btn)
    expect(screen.queryByRole('heading', { name: /^Release / })).toBeNull()
  })

  it('names the pet, Escape is Keep, and Release makes the first remaining pet current', () => {
    seed([...welcome(), ...hatched(15, { 10: { pick: 'cookies' } }), ev({ kind: 'name', key: 'm:books-5', name: 'Hazel' }, at(day(7)))])
    tab()
    const balance = document.querySelector('.creatures-head .cookie-pill')!.textContent
    const release = () => fireEvent.click(screen.getByRole('button', { name: 'Release…' }))
    release()
    const heading = screen.getByRole('heading', { name: 'Release Biscuit?' })
    expect(heading).toBe(document.activeElement)
    expect(screen.getByText("This can't be undone.")).toBeTruthy()
    // Keep comes before Release
    const buttons = within(heading.parentElement!).getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual(['Keep', 'Release'])
    fireEvent.keyDown(heading, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Release…' })).toBe(document.activeElement)
    release()
    fireEvent.click(screen.getByRole('button', { name: 'Release' }))
    expect(saved().find((e) => e.kind === 'release')).toMatchObject({ pet: WELCOME_EGG, confirm: 1 })
    expect(status()).toBe('Biscuit was released. Hazel is your current pet now.')
    expect(screen.getByRole('heading', { level: 2, name: 'Hazel' })).toBe(document.activeElement)
    // the album still counts the cat; the balance is the same
    expect(document.querySelector('.creatures-head .cookie-pill')!.textContent).toBe(balance)
    expect(screen.getByText('House cat')).toBeTruthy()
  })

  it('a shiny needs the warning and "Hold to release"', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    try {
      // the 20th book's shiny red fox, made current
      seed([...welcome(), ...hatched(20, { 10: { pick: 'cookies' } }), ev({ kind: 'current', key: 'pet', pet: 'm:books-20' }, at(day(22)))])
      tab()
      fireEvent.click(screen.getByRole('button', { name: 'Release…' }))
      expect(screen.getByRole('group', { name: '✨ This is a shiny!' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Release' })).toBeNull()
      const hold = screen.getByRole('button', { name: /^Hold to release / })
      fireEvent.pointerDown(hold, { button: 0 })
      act(() => void vi.advanceTimersByTime(1000))
      fireEvent.pointerLeave(hold)
      act(() => void vi.advanceTimersByTime(2000))
      expect(saved().some((e) => e.kind === 'release')).toBe(false)
      fireEvent.pointerDown(hold, { button: 0 })
      act(() => void vi.advanceTimersByTime(2000))
      expect(saved().find((e) => e.kind === 'release')).toMatchObject({ pet: 'm:books-20', confirm: 1, hold: 1 })
    } finally {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
    }
  })
})

describe('the album (Done when 8, 11)', () => {
  it('has 20 cards in six tier groups, found ones with label and source, the rest "Not found yet", and no canvas', () => {
    seed([...welcome(), ...hatched(25, { 10: { pick: 'keep' } })])
    tab()
    const album = screen.getByRole('heading', { name: 'Album' }).closest('section')!
    expect(album.querySelector('.album-count')!.textContent).toBe('4 of 20 found✨ 1 shiny')
    expect(within(album).getByText('✨ 1 shiny')).toBeTruthy()
    expect(within(album).getAllByRole('heading', { level: 3 }).map((h) => h.textContent!.replace(/^◆+ /, ''))).toEqual([
      'Common · 3 of 5',
      'Uncommon · 0 of 3',
      'Rare · 1 of 3',
      'Very rare · 0 of 3',
      'Epic · 0 of 2',
      'Legendary · 0 of 4',
    ])
    expect(within(album).getAllByRole('listitem').length).toBe(20)
    expect(within(album).getAllByText('Not found yet').length).toBe(16)
    expect(within(album).getByText('Domestic animal')).toBeTruthy()
    expect(within(album).getByText('Not on the IUCN Red List')).toBeTruthy()
    expect(within(album).getByText('Vulnerable')).toBeTruthy()
    expect(within(album).getByText('IUCN Red List, 2015')).toBeTruthy()
    // ×2 red squirrels and ×2 red foxes, the shiny fox's toggle
    expect(within(album).getAllByText('2 pets').length).toBe(2)
    const toggle = within(album).getByRole('button', { name: 'Show the shiny red fox' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(album.querySelector('img[src="/creatures/red-fox-grown-shiny.webp"]')).toBeTruthy()
    expect([...album.querySelectorAll('img')].every((img) => img.getAttribute('alt') === '')).toBe(true)
    expect(album.querySelectorAll('canvas').length).toBe(0)
  })

  it('is not there before the welcome hatch', () => {
    tab()
    expect(screen.queryByRole('heading', { name: 'Album' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Eggs' })).toBeNull()
  })
})

describe('Waiting for you and the block (Done when 5, 6)', () => {
  function Block({ books }: { books: Book[] }) {
    const { c, feed } = useCreatures(books)
    return <CreaturesCard c={c} onFeed={feed} onOpen={() => {}} onHatch={() => {}} onHatchMilestone={() => {}} />
  }

  it('the block shows the egg waiting with Hatch, or the next-egg line', () => {
    seed([...welcome(), ...hatched(20, { 10: { pick: 'keep' } })])
    const { unmount } = render(
      <CreaturesProvider accountId={null}>
        <Block books={BOOKS} />
      </CreaturesProvider>,
    )
    expect(screen.getByText('🥚 A rare egg is waiting')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Hatch the rare egg' })).toBeTruthy()
    unmount()
    seed([...welcome(), ...hatched(25, { 10: { pick: 'keep' } })])
    render(
      <CreaturesProvider accountId={null}>
        <Block books={BOOKS} />
      </CreaturesProvider>,
    )
    expect(screen.getByText('🥚 Next egg: 5 more books')).toBeTruthy()
  })

  it('Waiting for you: one egg with its reason, several in one line, and the 🐣 duplicate line', () => {
    const egg = { id: 'm:books-25', tier: 'rare' as const, kind: 'books' as const, day: TODAY, n: 25 }
    const onHatch = vi.fn()
    const onChoose = vi.fn()
    const { unmount } = render(
      <WaitingCard toRate={[]} questions={[]} onUpdate={() => {}} onShowBook={() => {}} creatureEggs={{ eggs: [egg], onHatch }} creatureDuplicate={{ species: 'koala', onChoose }} />,
    )
    expect(screen.getByText('A rare egg is waiting for you!')).toBeTruthy()
    expect(screen.getByText('For your 25th book')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hatch the rare egg' }))
    expect(onHatch).toHaveBeenCalled()
    expect(screen.getByText('Your new koala is waiting for you to choose')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Choose for your new koala' }))
    expect(onChoose).toHaveBeenCalled()
    unmount()
    render(<WaitingCard toRate={[]} questions={[]} onUpdate={() => {}} onShowBook={() => {}} creatureEggs={{ eggs: [egg, egg, egg], onHatch }} />)
    expect(screen.getByText('3 eggs are waiting for you!')).toBeTruthy()
    expect(screen.queryByText('For your 25th book')).toBeNull()
    expect(screen.getByRole('button', { name: 'Hatch the oldest egg' })).toBeTruthy()
  })
})
