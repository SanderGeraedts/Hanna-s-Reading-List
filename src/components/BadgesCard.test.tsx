import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
const { BadgesCard } = await import('./NewBlocks')
const { badges } = await import('#/lib/badges')

const books: Book[] = [
  { id: 'a', title: 'Circe', authors: ['M'], color: '#c99a45', status: 'read', addedAt: 1, finished: ['2026-03-01'], readCount: 1 },
]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the Badges block can be folded', () => {
  it('folds the list away, keeps the count, and remembers it on this device', () => {
    render(<BadgesCard books={books} />)
    const fold = screen.getByRole('button', { name: /^Badges/ })
    expect(fold.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('badges-list')!.hidden).toBe(false)
    fireEvent.click(fold)
    expect(fold.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
    expect(screen.getByText(/unlocked/)).toBeTruthy()
    cleanup()
    render(<BadgesCard books={books} />)
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
  })
})

// T-0042: a demo shelf with an earned secret (Dusty pile, 1 May), Explorer (5 genres, 20 Mar),
// First book (3 Jan), and 5 books locked at 4 of 5; the other 12 secrets are hidden
const read = (id: string, day: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  finished: [day],
  readCount: 1,
  ...extra,
})
const shelf: Book[] = [
  read('a', '2026-01-03', { genres: ['Fantasy', 'Romance'] }),
  read('b', '2026-02-10', { genres: ['Mystery'] }),
  read('c', '2026-03-20', { genres: ['History', 'Horror'] }),
  read('d', '2026-05-01', { addedAt: 1 }),
]
const grid = () => screen.getByRole('list', { name: 'Badges' })
const medals = () => within(grid()).getAllByRole('button')
const medal = (name: string) => within(grid()).getByRole('button', { name })
const card = () => document.getElementById('badges-card')!

describe('the medal grid (T-0042)', () => {
  it('shows one medal per badge, earned newest first, then locked closest first, then hidden', () => {
    render(<BadgesCard books={shelf} />)
    const all = badges(shelf)
    const m = medals()
    expect(m).toHaveLength(all.length)
    expect(screen.getByText(`3 of ${all.length} unlocked (4%)`)).toBeTruthy()
    const names = m.map((b) => b.getAttribute('aria-label'))
    expect(names.slice(0, 4)).toEqual([
      'Dusty pile, gold, unlocked, secret badge',
      'Explorer, bronze, unlocked',
      'First book, bronze, unlocked',
      '5 books, locked, 4 of 5',
    ])
    const hiddenCount = all.filter((b) => b.secret && !b.earned).length
    expect(hiddenCount).toBe(12)
    expect(names.slice(-hiddenCount)).toEqual(Array(hiddenCount).fill('Hidden badge'))
    expect(names.slice(0, -hiddenCount)).not.toContain('Hidden badge')
    // a locked one-off says just "locked"
    expect(medal('Postcard from Oceania, locked')).toBeTruthy()
  })

  it('carries the tier on earned medals only, and never shows a hidden badge’s name or emoji', () => {
    render(<BadgesCard books={shelf} />)
    expect(medal('Dusty pile, gold, unlocked, secret badge').dataset.tier).toBe('gold')
    expect(medal('Explorer, bronze, unlocked').dataset.tier).toBe('bronze')
    const locked = medal('5 books, locked, 4 of 5')
    expect(locked.dataset.state).toBe('locked')
    expect(locked.dataset.tier).toBeUndefined()
    expect(locked.className).not.toMatch(/gold|silver|bronze/)
    const hidden = medals().at(-1)!
    expect(hidden.dataset.state).toBe('hidden')
    expect(hidden.dataset.tier).toBeUndefined()
    expect(hidden.textContent).toBe('?')
    expect(hidden.title).toBe('Hidden badge')
    expect(grid().textContent).not.toContain('🌷')
    expect(document.body.textContent).not.toMatch(/Home sweet home|Loyal fan/)
  })

  it('opens one card under the grid on a tap, switches on another, closes on the same', () => {
    render(<BadgesCard books={shelf} />)
    // the live region is in the page before any card opens
    const live = card().querySelector('[aria-live="polite"]')!
    expect(live).toBeTruthy()
    expect(live.textContent).toBe('')

    const first = medal('First book, bronze, unlocked')
    expect(first.getAttribute('aria-controls')).toBe('badges-card')
    expect(first.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    expect(within(card()).getByRole('heading', { name: 'First book' })).toBeTruthy()
    expect(live.textContent).toContain('Finish a book')
    expect(live.textContent).toContain('Bronze · Unlocked 3 Jan 2026')
    expect(card().getAttribute('aria-labelledby')).toBe('badges-card-title')

    fireEvent.click(medal('Dusty pile, gold, unlocked, secret badge'))
    expect(live.textContent).toMatch(/Gold · secret · Unlocked 1 May 2026/)

    const five = medal('5 books, locked, 4 of 5')
    fireEvent.click(five)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(five.getAttribute('aria-expanded')).toBe('true')
    expect(live.textContent).toContain('4 / 5')
    expect(within(card()).getAllByRole('heading')).toHaveLength(1)

    fireEvent.click(medal('Postcard from Oceania, locked'))
    expect(live.textContent).toContain('Locked')

    const hidden = medals().at(-1)!
    fireEvent.click(hidden)
    expect(live.textContent).toContain('Hidden badge')
    // the last hidden medal is now the Birthday book (T-0043): its riddle, never its name or 🎂
    expect(live.textContent).toContain('the candles are all for you')
    expect(live.textContent).not.toMatch(/Birthday book|🎂/)

    fireEvent.click(hidden)
    expect(hidden.getAttribute('aria-expanded')).toBe('false')
    expect(live.textContent).toBe('')
    expect(within(card()).queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('works with the keyboard: Enter and Space, one Tab stop, arrows, Home and End', () => {
    render(<BadgesCard books={shelf} />)
    const m = medals()
    // one Tab stop: the first medal
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[0]])
    m[0].focus()
    fireEvent.keyDown(m[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(m[1])
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[1]])
    fireEvent.keyDown(m[1], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(m[0])
    fireEvent.keyDown(m[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(m[0])
    fireEvent.keyDown(m[0], { key: 'End' })
    expect(document.activeElement).toBe(m.at(-1))
    fireEvent.keyDown(m.at(-1)!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(m.at(-1))
    fireEvent.keyDown(m.at(-1)!, { key: 'Home' })
    expect(document.activeElement).toBe(m[0])

    // Enter opens, focus stays on the medal; Space on the same closes
    fireEvent.keyDown(m[2], { key: 'Enter' })
    expect(m[2].getAttribute('aria-expanded')).toBe('true')
    expect(card().textContent).toContain('First book')
    m[2].focus()
    fireEvent.keyDown(m[2], { key: ' ' })
    expect(m[2].getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(m[3], { key: ' ' })
    expect(m[3].getAttribute('aria-expanded')).toBe('true')
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[3]])
  })

  it('closes with × or Escape and puts focus back on its medal; folding closes it too', () => {
    render(<BadgesCard books={shelf} />)
    const first = medal('First book, bronze, unlocked')
    first.focus()
    fireEvent.click(first)
    expect(document.activeElement).toBe(first)
    const close = within(card()).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.click(close)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(first)

    fireEvent.click(first)
    within(card()).getByRole('button', { name: 'Close' }).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(first)

    fireEvent.click(first)
    const fold = screen.getByRole('button', { name: /^Badges/ })
    fireEvent.click(fold)
    fireEvent.click(fold)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(card().textContent).toBe('')
  })

  it('keeps the head row, count and bar, folded or not', () => {
    render(<BadgesCard books={shelf} />)
    const total = badges(shelf).length
    const bar = screen.getByRole('progressbar', { name: 'Badges unlocked' })
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe(String(total))
    fireEvent.click(screen.getByRole('button', { name: /^Badges/ }))
    expect(screen.getByText(`3 of ${total} unlocked (4%)`)).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Badges unlocked' })).toBeTruthy()
  })

  it('follows the badge when the shelf changes under an open card', () => {
    const { rerender } = render(<BadgesCard books={shelf} />)
    fireEvent.click(medal('5 books, locked, 4 of 5'))
    rerender(<BadgesCard books={[...shelf, read('e', '2026-06-01')]} />)
    const earned = medal('5 books, silver, unlocked')
    expect(earned.getAttribute('aria-expanded')).toBe('true')
    expect(medals()[0]).toBe(earned)
    expect(card().textContent).toContain('Silver · Unlocked 1 Jun 2026')
  })
})

// T-0043, D-0039: the birthday row at the end of the block, kept on this device only
const KEY = 'hannas-reading-list:birthday'
const row = () => screen.getByRole('group', { name: 'Birthday' })
const daySelect = () => within(row()).getByRole('combobox', { name: 'Day' }) as HTMLSelectElement
const monthSelect = () => within(row()).getByRole('combobox', { name: 'Month' }) as HTMLSelectElement
const pickDay = (day: string, month: string) => {
  fireEvent.change(daySelect(), { target: { value: day } })
  fireEvent.change(monthSelect(), { target: { value: month } })
}
const press = (name: string) => fireEvent.click(within(row()).getByRole('button', { name }))
const birthdayMedal = () => within(grid()).getAllByRole('button').find((b) => b.dataset.id === 'birthday')!

describe('the birthday row (T-0043)', () => {
  it('is the last thing in the folding body, after the card, and folds away with the grid', () => {
    render(<BadgesCard books={shelf} />)
    const body = document.getElementById('badges-list')!
    expect(body.lastElementChild).toBe(row())
    expect(row().previousElementSibling).toBe(card())
    expect(card().contains(row())).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /^Badges/ }))
    expect(body.hidden).toBe(true)
  })

  it('offers Day, Month and Save while unset; picking without Save stores nothing', () => {
    render(<BadgesCard books={shelf} />)
    expect(within(row()).getByText('Birthday')).toBeTruthy()
    const days = [...daySelect().options].map((o) => o.text)
    expect(days[0]).toBe('Day')
    expect(days.slice(1)).toEqual(Array.from({ length: 31 }, (_, i) => String(i + 1)))
    const months = [...monthSelect().options]
    expect(months[0].text).toBe('Month')
    expect(months[1]).toMatchObject({ text: 'January', value: '01' })
    expect(months[12]).toMatchObject({ text: 'December', value: '12' })
    expect(within(row()).getByRole('button', { name: 'Save' })).toBeTruthy()
    pickDay('14', '05')
    expect(localStorage.getItem(KEY)).toBeNull()
    // nowhere in the row: the secret's emoji or name, a year, or a hint sentence
    const words = row().cloneNode(true) as HTMLElement
    words.querySelectorAll('select').forEach((s) => s.remove())
    expect(words.textContent).toBe('BirthdaySave')
    expect(row().textContent).not.toMatch(/🎂|Birthday book/)
    expect(row().querySelectorAll('select')).toHaveLength(2)
  })

  it('saves MM-DD on Save, shows "14 May" with Change and Clear, focuses Change, and remembers it', () => {
    render(<BadgesCard books={shelf} />)
    pickDay('14', '05')
    press('Save')
    expect(localStorage.getItem(KEY)).toBe('05-14')
    expect(row().textContent).toContain('Birthday14 May')
    const change = within(row()).getByRole('button', { name: 'Change birthday' })
    expect(change.textContent).toBe('Change')
    expect(document.getElementById(change.getAttribute('aria-describedby')!)!.textContent).toBe('14 May')
    expect(within(row()).getByRole('button', { name: 'Clear birthday' }).textContent).toBe('Clear')
    expect(document.activeElement).toBe(change)
    expect(within(row()).queryByRole('combobox')).toBeNull()
    expect(row().textContent).not.toMatch(/🎂|Birthday book|20\d\d/)
    cleanup()
    render(<BadgesCard books={shelf} />)
    expect(row().textContent).toContain('14 May')
  })

  it('says how to fix a missing or impossible day, stores nothing, and lets 29 February through', () => {
    render(<BadgesCard books={shelf} />)
    fireEvent.change(daySelect(), { target: { value: '14' } })
    const save = within(row()).getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.click(save)
    const alert = within(row()).getByRole('alert')
    expect(alert.textContent).toBe('Pick a day and a month.')
    expect(daySelect().getAttribute('aria-invalid')).toBe('true')
    expect(monthSelect().getAttribute('aria-describedby')).toBe(alert.id)
    expect(document.activeElement).toBe(save)
    expect(localStorage.getItem(KEY)).toBeNull()
    // the next change of either select takes it away
    fireEvent.change(daySelect(), { target: { value: '31' } })
    expect(within(row()).queryByRole('alert')).toBeNull()
    expect(daySelect().getAttribute('aria-invalid')).toBeNull()
    fireEvent.change(monthSelect(), { target: { value: '04' } })
    press('Save')
    expect(within(row()).getByRole('alert').textContent).toBe('There is no 31 April.')
    expect(localStorage.getItem(KEY)).toBeNull()
    pickDay('29', '02')
    press('Save')
    expect(localStorage.getItem(KEY)).toBe('02-29')
    expect(row().textContent).toContain('29 February')
  })

  it('changes it: the selects on the saved day, Save stores the new one; Cancel and Escape keep the old', () => {
    localStorage.setItem(KEY, '05-14')
    render(<BadgesCard books={shelf} />)
    press('Change birthday')
    expect(daySelect().value).toBe('14')
    expect(monthSelect().value).toBe('05')
    expect(document.activeElement).toBe(daySelect())
    pickDay('2', '09')
    press('Cancel')
    expect(localStorage.getItem(KEY)).toBe('05-14')
    expect(row().textContent).toContain('14 May')
    expect(document.activeElement).toBe(within(row()).getByRole('button', { name: 'Change birthday' }))

    press('Change birthday')
    pickDay('2', '09')
    fireEvent.keyDown(daySelect(), { key: 'Escape' })
    expect(localStorage.getItem(KEY)).toBe('05-14')
    expect(document.activeElement).toBe(within(row()).getByRole('button', { name: 'Change birthday' }))

    press('Change birthday')
    pickDay('2', '09')
    press('Save')
    expect(localStorage.getItem(KEY)).toBe('09-02')
    expect(row().textContent).toContain('2 September')
    expect(document.activeElement).toBe(within(row()).getByRole('button', { name: 'Change birthday' }))
  })

  it('Escape in the row does not close an open medal card', () => {
    localStorage.setItem(KEY, '05-14')
    render(<BadgesCard books={shelf} />)
    fireEvent.click(medal('First book, bronze, unlocked'))
    press('Change birthday')
    fireEvent.keyDown(daySelect(), { key: 'Escape' })
    expect(card().textContent).toContain('First book')
    expect(medal('First book, bronze, unlocked').getAttribute('aria-expanded')).toBe('true')
  })

  it('earns the Birthday book straight after saving, and Clear takes it back to a "?" and focuses Day', () => {
    render(<BadgesCard books={[...shelf, read('bd', '2025-05-14')]} />)
    expect(birthdayMedal().getAttribute('aria-label')).toBe('Hidden badge')
    pickDay('14', '05')
    press('Save')
    const earned = birthdayMedal()
    expect(earned.getAttribute('aria-label')).toBe('Birthday book, gold, unlocked, secret badge')
    expect(earned.textContent).toBe('🎂')
    press('Clear birthday')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(birthdayMedal().getAttribute('aria-label')).toBe('Hidden badge')
    expect(birthdayMedal().textContent).toBe('?')
    expect(document.activeElement).toBe(daySelect())
    expect(daySelect().value).toBe('')
  })

  it('folding while changing drops the unsaved picks', () => {
    localStorage.setItem(KEY, '05-14')
    render(<BadgesCard books={shelf} />)
    press('Change birthday')
    pickDay('2', '09')
    const fold = screen.getByRole('button', { name: /^Badges/ })
    fireEvent.click(fold)
    fireEvent.click(fold)
    expect(row().textContent).toContain('14 May')
    expect(within(row()).queryByRole('combobox')).toBeNull()
  })
})

describe('T-0042 follow-ups (T-0043 F11)', () => {
  it('cancels Space’s keyup on a medal, so keyDown + keyUp Space leaves exactly one card open', () => {
    render(<BadgesCard books={shelf} />)
    const first = medal('First book, bronze, unlocked')
    first.focus()
    fireEvent.keyDown(first, { key: ' ' })
    const up = fireEvent.keyUp(first, { key: ' ' })
    expect(up).toBe(false) // defaultPrevented
    expect(medals().filter((b) => b.getAttribute('aria-expanded') === 'true')).toEqual([first])
    expect(card().textContent).toContain('First book')
  })

  it('labels the card only while it is open', () => {
    render(<BadgesCard books={shelf} />)
    expect(card().hasAttribute('aria-labelledby')).toBe(false)
    expect(card().querySelector('[aria-live="polite"]')).toBeTruthy()
    fireEvent.click(medal('First book, bronze, unlocked'))
    expect(card().getAttribute('aria-labelledby')).toBe('badges-card-title')
    expect(document.getElementById('badges-card-title')).toBeTruthy()
    fireEvent.click(medal('First book, bronze, unlocked'))
    expect(card().hasAttribute('aria-labelledby')).toBe(false)
  })
})
