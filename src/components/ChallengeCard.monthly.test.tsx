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
  it('picks this month (until it is over) into the challenge itself, with books that fit first', () => {
    const onOwnChange = vi.fn()
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={() => {}} editing onEditing={() => {}} own={classics} onOwnChange={onOwnChange} />)
    expect(screen.getByRole('heading', { name: 'Classics' })).toBeTruthy()
    const november = screen.getByLabelText('November') as HTMLSelectElement
    // October is over: fixed; November can still be picked
    expect(screen.queryByLabelText('October')).toBeNull()
    const groups = within(november).getAllByRole('group')
    expect(groups[0].getAttribute('label')).toBe('Fits this challenge')
    expect(within(groups[0]).getAllByRole('option').map((o) => o.textContent)).toEqual(['Jane Eyre'])
    fireEvent.change(november, { target: { value: 'jane' } })
    expect(onOwnChange).toHaveBeenCalledWith({ ...classics, months: { '11': 'jane' } })
  })

  it('says when the same book is in another monthly challenge that month', () => {
    const picked = { ...classics, months: { '11': 'babel' } }
    const others = [{ name: 'Monthly challenge', picksOf: ownMonthPicks({ year: 2026, months: { '11': 'babel' } }, BOOKS) }]
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={() => {}} editing onEditing={() => {}} own={picked} others={others} />)
    expect(screen.getByText('also in Monthly challenge for November')).toBeTruthy()
  })

  it('the original Monthly challenge can now change this month too', () => {
    const onUpdate = vi.fn()
    render(<ChallengeCard books={BOOKS} onShowBook={() => {}} onUpdate={onUpdate} editing onEditing={() => {}} />)
    fireEvent.change(screen.getByLabelText('November'), { target: { value: 'dune' } })
    expect(onUpdate).toHaveBeenCalledWith('dune', { challengeMonth: '2026-11' })
    expect(onUpdate).toHaveBeenCalledWith('babel', { challengeMonth: undefined })
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
