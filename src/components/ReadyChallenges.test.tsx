import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }), loadGoals: async () => null, saveGoal: async () => true }))

const { MinutesChallengeCard, SeasonChallengeCard, SeriesChallengeCard, WorldChallengeCard } = await import('./ReadyChallenges')
const { newSeriesPick } = await import('#/lib/seriesChallenge')
type OwnChallenge = import('#/lib/ownChallenges').OwnChallenge

/** The four new ready-made challenges (T-0091, D-0065). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  ...extra,
})

const read = (id: string, day: string, extra: Partial<Book> = {}) => book(id, { readCount: 1, finished: [day], ...extra })

afterEach(cleanup)

describe('around the world', () => {
  it('counts the countries and lists them', () => {
    const shelf = [read('a', '2026-01-02', { places: ['Japan'] }), read('b', '2026-02-02', { places: ['Italy'] })]
    render(<WorldChallengeCard books={shelf} year={2026} />)
    expect(screen.getByRole('heading', { name: 'Around the world' })).toBeTruthy()
    expect(screen.getByText('2 of 12')).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Around the world: 2 of 12 countries' })).toBeTruthy()
    const list = screen.getByRole('list', { name: 'Countries in 2026' })
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Japan', 'Italy'])
  })

  it('says so when nothing has been read anywhere yet, and still draws the bar', () => {
    render(<WorldChallengeCard books={[read('a', '2026-01-02')]} year={2026} />)
    expect(screen.getByText('No countries yet this year.')).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})

describe('seasonal', () => {
  const shelf = [
    ...Array.from({ length: 3 }, (_, i) => read(`a${i}`, `2026-10-0${i + 1}`, { genres: ['Horror'] })),
    read('s', '2026-07-01', { genres: ['Romance'] }),
  ]

  it('shows four seasons, their numbers, and marks the one happening now', () => {
    render(<SeasonChallengeCard books={shelf} year={2026} today="2026-11-23" />)
    expect(screen.getByText('1 of 4')).toBeTruthy()
    const rows = within(screen.getByRole('list', { name: 'Seasonal 2026' })).getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(rows[2].getAttribute('aria-label')).toBe('Autumn: 3 of 3 cosy or spooky reads, done, now')
    expect(rows[1].getAttribute('aria-label')).toBe('Summer: 1 of 5 beach reads')
    expect(rows[2].className).toContain('current')
    expect(rows[2].textContent).toContain('✓')
  })

  it('marks no season as current in a past year', () => {
    render(<SeasonChallengeCard books={shelf} year={2026} today="2027-11-23" />)
    const rows = within(screen.getByRole('list', { name: 'Seasonal 2026' })).getAllByRole('listitem')
    expect(rows.filter((r) => r.className.includes('current'))).toHaveLength(0)
  })
})

describe('minutes a day', () => {
  const log = { '2026-03-14': 0.5, '2026-03-02': 0.01 }
  const shelf = [book('r', { status: 'reading', pages: 300, readingLog: log })]

  it('draws the month grid with the days reached, today and the days to come', () => {
    render(<MinutesChallengeCard books={shelf} year={2026} today="2026-03-20" />)
    expect(screen.getByRole('heading', { name: 'Minutes a day' })).toBeTruthy()
    // 79 days of 2026 have happened by 20 March; one of them reached 20 minutes
    expect(screen.getByText('1 of 79 days · 20 min a day')).toBeTruthy()
    const grid = screen.getByRole('group', { name: 'March 2026' })
    const days = within(grid).getAllByRole('img')
    expect(days).toHaveLength(31)
    expect(days[13].getAttribute('aria-label')).toBe('14 March: 225 minutes, reached')
    expect(days[1].getAttribute('aria-label')).toBe('2 March: 5 minutes')
    expect(days[20].getAttribute('aria-label')).toBe('21 March: still to come')
    expect(days[19].className).toContain('today')
  })

  it('walks the months inside the year only', () => {
    render(<MinutesChallengeCard books={shelf} year={2026} today="2026-01-10" />)
    expect(screen.getByRole('button', { name: 'Previous month' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('February')).toBeTruthy()
  })

  it('shows 29 cells in a leap February and 28 in an ordinary one', () => {
    const { unmount } = render(<MinutesChallengeCard books={[]} year={2028} today="2028-02-10" />)
    expect(within(screen.getByRole('group', { name: 'February 2028' })).getAllByRole('img')).toHaveLength(29)
    unmount()
    render(<MinutesChallengeCard books={[]} year={2027} today="2027-02-10" />)
    expect(within(screen.getByRole('group', { name: 'February 2027' })).getAllByRole('img')).toHaveLength(28)
  })

  it('says a month with nothing read in it is empty', () => {
    render(<MinutesChallengeCard books={[]} year={2026} today="2026-03-20" />)
    expect(screen.getByText('Nothing read yet in March.')).toBeTruthy()
  })
})

describe('read the series', () => {
  const shelf = [
    read('t1', '2026-01-02', { series: 'Throne of Glass', seriesIndex: 1 }),
    book('t2', { status: 'want', series: 'Throne of Glass', seriesIndex: 2 }),
    read('l1', '2026-02-02', { series: 'The Lord of the Rings', seriesIndex: 1 }),
    read('l2', '2026-03-02', { series: 'The Lord of the Rings', seriesIndex: 2 }),
  ]
  const picks: OwnChallenge[] = [
    { id: 'p1', name: 'Throne of Glass', target: 2, year: 2026, rule: 'finishseries', value: 'throne of glass' },
    { id: 'p2', name: 'The Lord of the Rings', target: 2, year: 2026, rule: 'finishseries', value: 'the lord of the rings' },
  ]

  it('shows a bar per picked series and a tick on a finished one', () => {
    render(<SeriesChallengeCard books={shelf} year={2026} own={picks} editable onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getAllByText('1 of 2').length).toBeGreaterThanOrEqual(1)
    const rows = within(screen.getByRole('list', { name: 'Series in 2026' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(screen.getByRole('progressbar', { name: 'Throne of Glass: 1 of 2' })).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'The Lord of the Rings: 2 of 2, done' })).toBeTruthy()
    expect(rows[1].textContent).toContain('✓')
  })

  it('asks for a pick when she has none', () => {
    render(<SeriesChallengeCard books={shelf} year={2026} own={[]} editable onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getByText('Pick a series to finish this year.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '＋ Add a series' })).toBeTruthy()
  })

  it('adds a series from a labelled picker', () => {
    const onAdd = vi.fn()
    render(<SeriesChallengeCard books={shelf} year={2026} own={[]} editable onAdd={onAdd} onRemove={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '＋ Add a series' }))
    const select = screen.getByLabelText('Which series') as HTMLSelectElement
    expect([...select.options].map((o) => o.textContent)).toEqual(['Pick one…', 'The Lord of the Rings', 'Throne of Glass'])
    expect(screen.getByRole('button', { name: 'Add' }).hasAttribute('disabled')).toBe(true)
    fireEvent.change(select, { target: { value: 'throne of glass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toMatchObject({ rule: 'finishseries', value: 'throne of glass', target: 2 })
  })

  it('never offers a series she already picked', () => {
    render(<SeriesChallengeCard books={shelf} year={2026} own={picks} editable onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.queryByRole('button', { name: '＋ Add a series' })).toBeNull()
  })

  it('removes a pick after a confirm, and does nothing when she says no', () => {
    const onRemove = vi.fn()
    render(<SeriesChallengeCard books={shelf} year={2026} own={picks} editable onAdd={() => {}} onRemove={onRemove} />)
    const remove = screen.getByRole('button', { name: 'Remove Throne of Glass from the challenge' })
    const ask = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', ask)
    fireEvent.click(remove)
    expect(onRemove).not.toHaveBeenCalled()
    ask.mockReturnValue(true)
    fireEvent.click(remove)
    expect(onRemove).toHaveBeenCalledWith('p1')
  })

  it('a past year shows the rows but no way to change them', () => {
    render(<SeriesChallengeCard books={shelf} year={2026} own={picks} editable={false} onAdd={() => {}} onRemove={() => {}} />)
    expect(within(screen.getByRole('list', { name: 'Series in 2026' })).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: '＋ Add a series' })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull()
  })

  it('shows a pick whose series has gone, with its saved name and target', () => {
    const gone: OwnChallenge[] = [{ id: 'g', name: 'Gone Series', target: 7, year: 2026, rule: 'finishseries', value: 'gone series' }]
    render(<SeriesChallengeCard books={shelf} year={2026} own={gone} editable onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getByRole('progressbar', { name: 'Gone Series: 0 of 7' })).toBeTruthy()
  })

  it('makes a pick with the series size as its target', () => {
    expect(newSeriesPick('throne of glass', 'Throne of Glass', shelf, 2026)).toMatchObject({ target: 2 })
  })
})
