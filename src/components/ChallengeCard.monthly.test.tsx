import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Book } from '#/lib/library'
import type { OwnChallenge } from '#/lib/ownChallenges'
import { ownMonthPicks } from '#/lib/monthChallenge'
import { ChallengeCard, ThisMonthChallenges } from './ChallengeCard'
import { NewChallengeForm } from './OwnChallenges'

/** Monthly challenges, the same everywhere (T-0126, D-0094). */

const b = (id: string, extra: Partial<Book> = {}) => ({ id, title: id, authors: [], color: '#333', status: 'want', addedAt: 1, ...extra }) as Book
const BOOKS = [
  b('jane', { title: 'Jane Eyre', genres: ['Classics'] }),
  b('dune', { title: 'Dune', genres: ['Science fiction'] }),
  b('babel', { title: 'Babel', challengeMonth: '2026-11', status: 'reading', progress: 0.4 }),
]
const classics: OwnChallenge = { id: 'c1', name: 'Classics', target: 12, year: 2026, rule: 'genre', value: 'Classics', kind: 'monthly', months: {} }

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-28T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

describe('a monthly own challenge', () => {
  it('picks a month that has not started into the challenge itself, with books that fit first', () => {
    const onOwnChange = vi.fn()
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={() => {}} editing onEditing={() => {}} own={classics} onOwnChange={onOwnChange} />)
    expect(screen.getByRole('heading', { name: 'Classics' })).toBeTruthy()
    const december = screen.getByLabelText('December') as HTMLSelectElement
    // November has started but has no book yet: it can still get one (T-0128, D-0096)
    expect(screen.getByLabelText('November')).toBeTruthy()
    const groups = within(december).getAllByRole('group')
    expect(groups[0].getAttribute('label')).toBe('Fits this challenge')
    expect(within(groups[0]).getAllByRole('option').map((o) => o.textContent)).toEqual(['Jane Eyre'])
    fireEvent.change(december, { target: { value: 'jane' } })
    expect(onOwnChange).toHaveBeenCalledWith({ ...classics, months: { '12': 'jane' } })
  })

  it('says when the same book is in another monthly challenge that month', () => {
    const picked = { ...classics, months: { '12': 'dune' } }
    const others = [{ name: 'Monthly challenge', picksOf: ownMonthPicks({ year: 2026, months: { '12': 'dune' } }, BOOKS) }]
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={() => {}} editing onEditing={() => {}} own={picked} others={others} />)
    expect(screen.getByText('also in Monthly challenge for December')).toBeTruthy()
  })

  it('the original Monthly challenge follows the same rule: a started month with a book is fixed, the next can change', () => {
    const onUpdate = vi.fn()
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={onUpdate} editing onEditing={() => {}} />)
    // November has Babel: fixed; an empty earlier month can still be filled
    expect(screen.queryByLabelText('November')).toBeNull()
    expect(screen.getByLabelText('October')).toBeTruthy()
    expect(screen.getByText('Babel')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('December'), { target: { value: 'dune' } })
    expect(onUpdate).toHaveBeenCalledWith('dune', { challengeMonth: '2026-12' })
  })
})

describe('the dashboard card', () => {
  it('has one row per monthly challenge, with this month’s book or a way to pick one', () => {
    const onOpen = vi.fn()
    render(<ThisMonthChallenges books={BOOKS} own={[classics]} onShowBook={() => {}} onOpen={onOpen} />)
    expect(screen.getByRole('heading', { name: 'This month’s challenges' })).toBeTruthy()
    expect(screen.getByText('Babel')).toBeTruthy()
    expect(screen.getByText('40% · 2 days left in November')).toBeTruthy()
    expect(screen.getByText('No book for November yet')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pick' }))
    expect(onOpen).toHaveBeenCalled()
  })
})

describe('making one', () => {
  it('+ New challenge offers A book a month: no amount to fill in, twelve months', () => {
    const onSave = vi.fn()
    render(<NewChallengeForm books={BOOKS} year={2026} onSave={onSave} onCancel={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'A book a month' }))
    expect(screen.queryByLabelText('How many')).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('e.g. Fantasy year'), { target: { value: 'From my TBR' } })
    fireEvent.submit(screen.getByRole('form', { name: 'New challenge' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'From my TBR', target: 12, year: 2026, kind: 'monthly', months: {} }))
  })
})

describe('until I reach the goal (T-0131, D-0099)', () => {
  it('the form offers For 2026 or Until I reach the goal, and saves the choice', () => {
    const onSave = vi.fn()
    render(<NewChallengeForm books={BOOKS} year={2026} onSave={onSave} onCancel={() => {}} />)
    expect(screen.getByRole('button', { name: 'For 2026' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Until I reach the goal' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Fantasy year'), { target: { value: 'Ten fantasy' } })
    fireEvent.submit(screen.getByRole('form', { name: 'New challenge' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ten fantasy', untilDone: true }))
  })

  it('a book a month has no such choice', () => {
    render(<NewChallengeForm books={BOOKS} year={2026} onSave={() => {}} onCancel={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'A book a month' }))
    expect(screen.queryByRole('button', { name: 'Until I reach the goal' })).toBeNull()
  })
})
