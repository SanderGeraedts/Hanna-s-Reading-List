import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useMemo, useState } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { CREATURES_START } from '#/lib/creatures/numbers'
import { addDays } from '#/lib/creatures/days'
import type { ShopCategory } from '#/lib/creatures/shop'

// no server: signed out, every server function mocked like the other creature tests
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

const { CreaturesPage } = await import('./CreaturesPage')
const { CreaturesProvider, useCreaturesValue } = await import('./creatures/CreaturesContext')
const { RoomPanel, useRoom } = await import('./RoomPanel')
const { ownedDecor } = await import('#/lib/creatures/shop')

/**
 * The creature shop in the Creatures tab (T-0031 Done when 1, 5–10): the
 * Den | Shop switch, the seven categories, the four card states, the inline
 * buy confirm (Escape, one buy from a double tap), food on the tap, dressing
 * any pet, placing in the den, habitats, room decorations in the 🎨 panel and
 * the live region's words. happy-dom has no WebGL, so the den is left out (as
 * on a device without it); the strips and cards still work.
 */

const TODAY = addDays(CREATURES_START, 2)
const LOG_KEY = 'hannas-reading-list:creatures:local'
const ROOM_KEY = 'hannas-reading-list:room'
// 0.36 of 1,000 pages on each of two days = 1,080 minutes = 216 cookies (and an hour egg at 10 hours)
const BOOKS: Book[] = [
  { id: 'big', title: 'A Big Book', authors: ['A. Writer'], color: '#333', status: 'reading', addedAt: 0, pages: 1000, readingLog: { [TODAY]: 0.36, [addDays(TODAY, -1)]: 0.36 } },
]
const at = (time: string) => new Date(`${TODAY}T${time}:00`).getTime()

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.setSystemTime(new Date(`${TODAY}T12:00:00`))
})
/** a second later: two choices of one spot in the same millisecond would tie */
const tick = () => vi.setSystemTime(new Date(Date.now() + 1000))

let n = 0
const ev = (e: Record<string, string | number>, time = '09:00') => ({ id: `t-${n++}`, at: at(time), ...e })
/** the welcome cat Biscuit; `spend` cookies fed away to set the balance (216 − spend); then whatever else */
function seed(spend = 0, more: Array<Record<string, string | number>> = []) {
  const log = [ev({ kind: 'hatch', egg: 'welcome', species: 'cat' }, '08:00'), ev({ kind: 'name', key: 'welcome', name: 'Biscuit' }, '08:01')]
  if (spend) log.push(ev({ kind: 'feed', pet: 'welcome', amount: spend }, '08:02'))
  for (const m of more) log.push(ev(m, '08:30'))
  localStorage.setItem(LOG_KEY, JSON.stringify(log))
}
const owns = (...items: string[]) => items.map((item) => ({ kind: 'buy', item, price: 1 }))
const savedLog = (): Array<Record<string, unknown>> => JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]')
const buys = () => savedLog().filter((e) => e.kind === 'buy')

/** The tab as the route has it: the URL's category in state, her room on this device with her purchases. */
function App({ books = BOOKS, shop = null, panel = false, onShop }: { books?: Book[]; shop?: ShopCategory | null; panel?: boolean; onShop?: (c: ShopCategory | null, o?: { replace?: boolean }) => void }) {
  const creatures = useCreaturesValue(null)
  const owned = useMemo(() => ownedDecor(creatures.choices.log), [creatures.choices.log])
  const [room, setRoom] = useRoom(owned)
  const [cat, setCat] = useState<ShopCategory | null>(shop)
  return (
    <CreaturesProvider value={creatures}>
      <CreaturesPage
        books={books}
        shop={cat}
        onShop={(c, o) => {
          onShop?.(c, o)
          setCat(c)
        }}
        room={room}
        onRoom={setRoom}
      />
      {panel && <RoomPanel room={room} onRoom={setRoom} onClose={() => {}} />}
    </CreaturesProvider>
  )
}

const status = () => document.querySelector('.creatures-page [role="status"]')!.textContent
const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li')! as HTMLElement
const tab = (name: RegExp) => screen.getByRole('tab', { name })

describe('the Den | Shop switch (Done when 5)', () => {
  it('is there from the first pet on, not before the welcome hatch', () => {
    render(<App shop="food" />)
    expect(screen.queryByRole('link', { name: /Shop/ })).toBeNull()
    // `&shop=` before the hatch shows the Den view
    expect(screen.getByRole('heading', { name: 'A welcome egg' })).toBeTruthy()
  })

  it('switches between the Den view and the Shop view (a history entry), Food by default', () => {
    seed()
    const onShop = vi.fn()
    render(<App onShop={onShop} />)
    const den = screen.getByRole('link', { name: /Den/ })
    const shop = screen.getByRole('link', { name: /Shop/ })
    expect(den.getAttribute('aria-current')).toBe('page')
    expect(den.getAttribute('href')).toBe('?view=creatures')
    expect(shop.getAttribute('href')).toBe('?view=creatures&shop=food')
    // the Den view has Dress up and Arrange
    expect(screen.getByRole('button', { name: /Dress up/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Arrange/ })).toBeTruthy()
    fireEvent.click(shop)
    expect(onShop).toHaveBeenLastCalledWith('food', undefined)
    expect(screen.getByRole('heading', { level: 2, name: 'Food' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Shop/ }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('link', { name: /Den/ }))
    expect(onShop).toHaveBeenLastCalledWith(null, undefined)
    expect(screen.queryByRole('tablist', { name: 'Shop' })).toBeNull()
  })

  it('has seven category chips with the 41 items; arrows move and open, replacing the URL', () => {
    seed()
    const onShop = vi.fn()
    render(<App shop="food" onShop={onShop} />)
    const chips = within(screen.getByRole('tablist', { name: 'Shop' })).getAllByRole('tab')
    expect(chips.map((c) => c.textContent?.trim())).toEqual(['🍓 Food', '🎀 Outfits', '🛋️ Home', '🥚 Eggs', '🧶 Toys', '🌲 Habitats', '🎨 Room'])
    expect(chips[0].getAttribute('aria-selected')).toBe('true')
    expect(chips[0].getAttribute('aria-controls')).toBe('shop-panel')
    expect(chips.filter((c) => c.tabIndex === 0)).toEqual([chips[0]])
    const counts: Record<string, number> = {}
    const headings: string[] = []
    for (let i = 0; i < 7; i++) {
      const panel = screen.getByRole('tabpanel')
      headings.push(within(panel).getByRole('heading', { level: 2 }).textContent!)
      counts[headings.at(-1)!] = within(panel).getAllByRole('listitem').length
      fireEvent.keyDown(document.activeElement && document.activeElement.getAttribute('role') === 'tab' ? document.activeElement : chips[0], { key: 'ArrowRight' })
    }
    expect(headings).toEqual(['Food', 'Outfits & accessories', 'Home', 'Eggs', 'Toys', 'Habitats', 'Reading room'])
    // 41 for sale, and the free Cosy den among the habitats
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(42)
    expect(onShop).toHaveBeenCalledWith('outfits', { replace: true })
    // focus stays on the chips
    expect(document.activeElement?.getAttribute('role')).toBe('tab')
  })

  it('Dress up opens Outfits dressing that pet, Arrange opens Home; focus on the heading', () => {
    seed()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Dress up/ }))
    const h = screen.getByRole('heading', { level: 2, name: 'Outfits & accessories' })
    expect(document.activeElement).toBe(h)
    expect(screen.getByRole('heading', { level: 3, name: 'Biscuit is wearing' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: /Den/ }))
    fireEvent.click(screen.getByRole('button', { name: /Arrange/ }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2, name: 'Home' }))
    expect(screen.getByRole('heading', { level: 3, name: 'In the den' })).toBeTruthy()
  })
})

describe('the four card states (Done when 6)', () => {
  const hat = () => card('Bobble hat')
  const hatBuy = () => within(hat()).getByRole('button', { name: 'Buy the bobble hat for 30 cookies' })

  it('affordable above and at the price', () => {
    seed(0)
    render(<App shop="outfits" />)
    expect(hatBuy().getAttribute('aria-disabled')).toBeNull()
    expect(within(hat()).getByText('Head')).toBeTruthy()
    expect(within(hat()).queryByText(/more/)).toBeNull()
    cleanup()
    seed(186) // 30 left
    render(<App shop="outfits" />)
    expect(hatBuy().getAttribute('aria-disabled')).toBeNull()
  })

  it('too expensive below the price: "N 🍪 more", disabled but focusable and described', () => {
    seed(202) // 14 left
    render(<App shop="outfits" />)
    const b = hatBuy()
    expect(b.getAttribute('aria-disabled')).toBe('true')
    expect(b.hasAttribute('disabled')).toBe(false)
    expect(within(hat()).getByText('16 🍪 more')).toBeTruthy()
    expect(document.getElementById(b.getAttribute('aria-describedby')!)!.textContent).toContain('16 more cookies needed')
    fireEvent.click(b)
    expect(within(hat()).queryByText(/Buy the bobble hat for 30/, { selector: 'p' })).toBeNull()
  })

  it('too expensive below zero, food too', () => {
    seed(220) // −4
    render(<App shop="outfits" />)
    expect(within(hat()).getByText('34 🍪 more')).toBeTruthy()
    fireEvent.click(tab(/Food/))
    const give = within(card('Berry snack')).getByRole('button', { name: 'Give Biscuit a berry snack for 5 cookies' })
    expect(give.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(give)
    expect(buys()).toEqual([])
  })

  it('owned and in use', () => {
    seed(0, [...owns('bobble-hat', 'big-bow'), { kind: 'wear', key: 'welcome:head', item: 'big-bow' }])
    render(<App shop="outfits" />)
    expect(within(hat()).getByText('✓ Owned')).toBeTruthy()
    expect(within(hat()).queryByText(/🍪/)).toBeNull()
    expect(within(hat()).getByRole('button', { name: 'Put the bobble hat on Biscuit' })).toBeTruthy()
    const bow = card('Big bow')
    expect(within(bow).getByText('✓ Wearing')).toBeTruthy()
    expect(bow.classList.contains('in-use')).toBe(true)
    expect(within(bow).getByRole('button', { name: 'Take the big bow off Biscuit' }).textContent).toBe('Take off')
  })
})

describe('buying (Design §6)', () => {
  const hat = () => card('Bobble hat')

  it('Buy opens the confirm in the card; Escape cancels, focus back on Buy; nothing saved', () => {
    seed()
    render(<App shop="outfits" />)
    fireEvent.click(within(hat()).getByRole('button', { name: 'Buy the bobble hat for 30 cookies' }))
    const q = within(hat()).getByText(/Buy the bobble hat for 30/, { selector: 'p' })
    expect(q.textContent).toBe('Buy the bobble hat for 30 🍪 cookies?')
    expect(document.activeElement).toBe(q)
    expect(screen.queryByRole('dialog')).toBeNull()
    // only one card in confirm at a time
    fireEvent.click(within(card('Big bow')).getByRole('button', { name: /^Buy the big bow/ }))
    expect(within(hat()).queryByText(/Buy the bobble hat for 30/, { selector: 'p' })).toBeNull()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(document.activeElement).toBe(within(card('Big bow')).getByRole('button', { name: 'Buy the big bow for 20 cookies' }))
    expect(buys()).toEqual([])
  })

  it('a double tap on the confirm buys once; the card turns owned with Put on, the pill drops', () => {
    seed()
    render(<App shop="outfits" />)
    fireEvent.click(within(hat()).getByRole('button', { name: 'Buy the bobble hat for 30 cookies' }))
    const confirm = within(hat()).getByRole('button', { name: 'Buy' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(buys().map((e) => [e.item, e.price])).toEqual([['bobble-hat', 30]])
    expect(within(hat()).getByText('✓ Owned')).toBeTruthy()
    expect(document.activeElement).toBe(within(hat()).getByRole('button', { name: 'Put the bobble hat on Biscuit' }))
    expect(status()).toBe('Bought the bobble hat. 186 cookies left.')
    expect(screen.getAllByText('186').length).toBeGreaterThan(0)
    // not put on by itself
    expect(screen.getByRole('heading', { level: 3, name: 'Biscuit is wearing' }).nextElementSibling!.textContent).not.toContain('Bobble hat')
  })

  it('a double tap on an egg buys one egg, which waits in the eggs', () => {
    seed()
    render(<App shop="eggs" />)
    const egg = () => card('Common egg')
    fireEvent.click(within(egg()).getByRole('button', { name: 'Buy a common egg for 60 cookies' }))
    expect(within(egg()).getByText(/Buy a common egg for 60/, { selector: 'p' })).toBeTruthy()
    const confirm = within(egg()).getByRole('button', { name: 'Buy' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(buys().length).toBe(1)
    expect(status()).toBe("Bought a common egg. It's waiting in your eggs.")
    // eggs can be bought again; the line stays until it's hatched
    expect(within(egg()).getByRole('button', { name: 'Buy a common egg for 60 cookies' })).toBeTruthy()
    expect(within(egg()).getByText(/Waiting in your eggs/)).toBeTruthy()
    expect(within(egg()).getByText('◆')).toBeTruthy()
    // Hatch goes to the Den view and hatches the oldest egg
    fireEvent.click(within(egg()).getByRole('link', { name: 'Hatch' }))
    expect(screen.queryByRole('tablist', { name: 'Shop' })).toBeNull()
    expect(savedLog().filter((e) => e.kind === 'hatch').length).toBe(2)
  })

  it('a balance that dropped meanwhile buys nothing: "Not enough cookies any more."', () => {
    seed(180) // 36 left
    const { rerender } = render(<App shop="outfits" />)
    fireEvent.click(within(hat()).getByRole('button', { name: 'Buy the bobble hat for 30 cookies' }))
    // a fix to a past day on another device: only today's reading is left (108 − 180 < 30)
    rerender(<App shop="outfits" books={[{ ...BOOKS[0], readingLog: { [TODAY]: 0.36 } }]} />)
    fireEvent.click(within(hat()).getByRole('button', { name: 'Buy' }))
    expect(buys()).toEqual([])
    expect(status()).toBe('Not enough cookies any more.')
    expect(within(hat()).getByRole('button', { name: 'Buy the bobble hat for 30 cookies' }).getAttribute('aria-disabled')).toBe('true')
  })

  it('food is given on the tap without a confirm, each tap counts, and the pet grows', () => {
    seed()
    render(<App shop="food" />)
    expect(within(card('Honey cake')).getByText('Grows Biscuit by 15')).toBeTruthy()
    const give = within(card('Honey cake')).getByRole('button', { name: 'Give Biscuit a honey cake for 12 cookies' })
    expect(give.textContent).toBe('Give to Biscuit')
    fireEvent.click(give)
    expect(status()).toMatch(/^Biscuit ate the honey cake\. 204 cookies left\./)
    fireEvent.click(give)
    expect(buys().map((e) => [e.item, e.price, e.pet])).toEqual([
      ['honey-cake', 12, 'welcome'],
      ['honey-cake', 12, 'welcome'],
    ])
  })
})

describe('dressing (Done when 7)', () => {
  it('puts on and takes off for the dressed pet, one per slot; words in the live region', () => {
    seed(0, owns('bobble-hat', 'big-bow'))
    render(<App shop="outfits" />)
    fireEvent.click(within(card('Bobble hat')).getByRole('button', { name: 'Put the bobble hat on Biscuit' }))
    expect(status()).toBe('Biscuit is wearing the bobble hat.')
    expect(savedLog().at(-1)).toMatchObject({ kind: 'wear', key: 'welcome:head', item: 'bobble-hat' })
    expect(within(card('Bobble hat')).getByText('✓ Wearing')).toBeTruthy()
    expect(document.activeElement).toBe(within(card('Bobble hat')).getByRole('button', { name: 'Take the bobble hat off Biscuit' }))
    // the bow replaces the hat in the head slot
    tick()
    fireEvent.click(within(card('Big bow')).getByRole('button', { name: 'Put the big bow on Biscuit' }))
    expect(within(card('Bobble hat')).getByText('✓ Owned')).toBeTruthy()
    const strip = screen.getByRole('heading', { level: 3, name: 'Biscuit is wearing' }).parentElement!
    expect(within(strip).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['HeadBig bowTake off', 'Facenothing', 'Necknothing', 'Backnothing'])
    // Take off in the strip: focus to the strip's heading
    tick()
    fireEvent.click(within(strip).getByRole('button', { name: 'Take the big bow off Biscuit' }))
    expect(status()).toBe('Took off the big bow.')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3, name: 'Biscuit is wearing' }))
  })

  it('dresses another pet from the Dress row without changing the current pet', () => {
    // 18 hours read: an hour egg, hatched
    seed(0, [...owns('star-cape'), { kind: 'hatch', egg: 'm:hours-10' }])
    render(<App shop="outfits" />)
    const row = screen.getByRole('radiogroup', { name: 'Dress' })
    const radios = within(row).getAllByRole('radio') as HTMLInputElement[]
    expect(radios.length).toBe(2)
    expect(radios[0].checked).toBe(true)
    fireEvent.click(radios[1])
    const other = radios[1].closest('label')!.textContent!
    expect(screen.getByRole('heading', { level: 3, name: `${other} is wearing` })).toBeTruthy()
    fireEvent.click(within(card('Star cape')).getByRole('button', { name: `Put the star cape on ${other}` }))
    expect(savedLog().at(-1)).toMatchObject({ kind: 'wear', key: 'm:hours-10:back', item: 'star-cape' })
    expect(savedLog().some((e) => e.kind === 'current')).toBe(false)
    // leaving Outfits shows the current pet again
    fireEvent.click(tab(/Food/))
    expect(within(card('Honey cake')).getByText('Grows Biscuit by 15')).toBeTruthy()
  })
})

describe('the den: home, toys, habitats (Done when 8)', () => {
  it('places a home item and replaces a toy; Put away brings the defaults back', () => {
    seed(0, [...owns('reading-lamp', 'ball', 'slide', 'cloud-cushion'), { kind: 'place', key: 'home:toy', item: 'ball' }])
    render(<App shop="home" />)
    fireEvent.click(within(card('Reading lamp')).getByRole('button', { name: 'Place the reading lamp in the den' }))
    expect(status()).toBe('The reading lamp is in the den.')
    expect(within(card('Reading lamp')).getByText('✓ In the den')).toBeTruthy()
    const strip = () => screen.getByRole('heading', { level: 3, name: 'In the den' }).parentElement!
    expect(within(strip()).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'BedGold cushion',
      'RugPlum rug',
      'Wallnothing',
      'Left cornernothing',
      'Right cornerReading lampPut away',
      'ToyBallPut away',
    ])
    fireEvent.click(within(card('Cloud cushion')).getByRole('button', { name: 'Place the cloud cushion in the den' }))
    tick()
    fireEvent.click(within(strip()).getByRole('button', { name: 'Put the cloud cushion away' }))
    expect(status()).toBe('Put the cloud cushion away.')
    expect(within(strip()).getAllByRole('listitem')[0].textContent).toBe('BedGold cushion')
    fireEvent.click(tab(/Toys/))
    fireEvent.click(within(card('Slide')).getByRole('button', { name: 'Place the slide in the den' }))
    expect(status()).toBe('The slide is in the den. The ball is put away.')
  })

  it('switches habitats; the Cosy den is always hers', () => {
    seed(0, owns('forest'))
    render(<App shop="habitats" />)
    const cosy = card('Cosy den')
    expect(within(cosy).getByText('✓ Your habitat')).toBeTruthy()
    expect(within(cosy).getByText('Your habitat now')).toBeTruthy()
    expect(within(cosy).queryByText(/🍪/)).toBeNull()
    fireEvent.click(within(card('Forest')).getByRole('button', { name: 'Use the forest as your habitat' }))
    expect(status()).toBe('The forest is your habitat now.')
    expect(within(card('Forest')).getByText('Your habitat now')).toBeTruthy()
    expect(within(card('Cosy den')).getByRole('button', { name: 'Use the cosy den as your habitat' })).toBeTruthy()
    expect(within(card('Beach')).getByRole('button', { name: 'Buy the beach for 100 cookies' })).toBeTruthy()
  })
})

describe('room decorations (Done when 9)', () => {
  it('a bought decoration is in the room straight away, in the 🎨 panel; hiding it is per device', () => {
    seed()
    render(<App shop="room" panel />)
    const panel = () => screen.getByRole('dialog', { name: 'Make the room yours' })
    expect(within(panel()).queryByText('Snow globe')).toBeNull()
    const globe = () => card('Snow globe')
    fireEvent.click(within(globe()).getByRole('button', { name: 'Buy the snow globe for 100 cookies' }))
    fireEvent.click(within(globe()).getByRole('button', { name: 'Buy' }))
    expect(within(globe()).getByText('✓ In the room')).toBeTruthy()
    expect(document.activeElement).toBe(within(globe()).getByRole('button', { name: 'Hide the snow globe in the room' }))
    const row = () => within(panel()).getByText('Snow globe').closest('li')!
    expect((within(row()).getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    // at the top of the list (the highest shelf, so it always gets a shelf; review 2026-11-23)
    expect(within(panel()).getAllByRole('listitem').at(0)).toBe(row())
    // decorations not bought appear nowhere
    expect(within(panel()).queryByText('Pennant flags')).toBeNull()
    fireEvent.click(within(globe()).getByRole('button', { name: 'Hide the snow globe in the room' }))
    expect(status()).toBe('The snow globe is hidden in the room on this device.')
    expect((within(row()).getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    expect(within(globe()).getByText('✓ Owned')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(ROOM_KEY)!).decor[0]).toEqual({ kind: 'snow-globe', on: false })

    // a second device: the same purchases (synced), its own room: there, switched on
    cleanup()
    localStorage.removeItem(ROOM_KEY)
    render(<App shop="room" panel />)
    expect((within(within(panel()).getByText('Snow globe').closest('li')!).getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(within(globe()).getByRole('button', { name: 'Hide the snow globe in the room' }))
    fireEvent.click(within(globe()).getByRole('button', { name: 'Show the snow globe in the room' }))
    expect(status()).toBe('The snow globe is in your reading room.')
  })
})

describe('keyboard and screen reader (Done when 10)', () => {
  it('names every card by an h3, pictures alt="", price pills read as cookies', () => {
    seed()
    render(<App shop="home" />)
    const lamp = card('Reading lamp')
    expect(within(lamp).getByRole('heading', { level: 3 }).textContent).toBe('Reading lamp')
    expect(lamp.querySelector('img')!.getAttribute('alt')).toBe('')
    expect(within(lamp).getByText('Right corner')).toBeTruthy()
    expect(lamp.querySelector('.price-pill')!.textContent).toBe('50 🍪 cookies')
    expect(lamp.querySelector('.price-pill [aria-hidden]')!.textContent).toBe('🍪')
  })

  it('can do every step with the keyboard: buy, place, put away, by Enter on buttons', async () => {
    seed(0)
    render(<App shop="toys" />)
    const ball = () => card('Ball')
    within(ball()).getByRole('button', { name: 'Buy the ball for 25 cookies' }).focus()
    fireEvent.click(document.activeElement!)
    fireEvent.click(within(ball()).getByRole('button', { name: 'Buy' }))
    fireEvent.click(document.activeElement!) // Place in the den (focus moved there)
    expect(status()).toBe('The ball is in the den.')
    tick()
    fireEvent.click(document.activeElement!) // Put away
    expect(status()).toBe('Put the ball away.')
    await act(async () => {})
    expect(savedLog().filter((e) => e.kind === 'place').length).toBe(1)
  })
})
