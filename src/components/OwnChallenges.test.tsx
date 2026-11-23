import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadChallenges: async () => null,
  saveChallenges: async () => true,
}))

const { NewChallengeForm, OwnChallengeCard } = await import('./OwnChallenges')
type OwnChallenge = import('#/lib/ownChallenges').OwnChallenge

/** The extra rules of her own challenges (T-0092, D-0062). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Sarah J. Maas'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  finished: ['2026-03-01'],
  ...extra,
})

const shelf = [
  book('a', { genres: ['Fantasy'], pages: 400, year: 1995, rating: 5 }),
  book('b', { genres: ['Romance'], authors: ['Someone Else'], pages: 200, year: 2021 }),
  book('c', { genres: ['Fantasy'], minutes: 600, pages: 600, format: 'audiobook', formats: ['audiobook'] }),
]

const select = (name: string) => screen.getByLabelText(name) as HTMLSelectElement
afterEach(cleanup)

describe('the new-challenge form', () => {
  it('has a name, a number with a unit, a rule and (when needed) a value', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    expect(screen.getByLabelText('How many')).toBeTruthy()
    const unit = select('Unit')
    expect([...unit.options].map((o) => o.textContent)).toEqual(['Books', 'Pages', 'Hours'])
    const rule = select('What counts')
    expect([...rule.options].map((o) => o.textContent)).toEqual([
      'Any book',
      'From my pile',
      'A genre',
      'A trope',
      'By author',
      'From a decade',
      'Rated 4+',
      'A language',
      'A format',
      'A series',
      'Finish a series',
    ])
    // Any book needs no "Which"
    expect(screen.queryByLabelText('Which')).toBeNull()
    fireEvent.change(rule, { target: { value: 'genre' } })
    expect(screen.getByLabelText('Which')).toBeTruthy()
    // Rated 4+ needs none either
    fireEvent.change(rule, { target: { value: 'rating4' } })
    expect(screen.queryByLabelText('Which')).toBeNull()
  })

  it('offers decades newest first and authors once', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    fireEvent.change(select('What counts'), { target: { value: 'decade' } })
    expect([...select('Which').options].map((o) => o.textContent)).toEqual(['Pick one…', '2020s', '1990s'])
    fireEvent.change(select('What counts'), { target: { value: 'author' } })
    expect([...select('Which').options].map((o) => o.textContent)).toEqual(['Pick one…', 'Sarah J. Maas', 'Someone Else'])
  })

  it('adds and removes a second rule, whose list leaves out Any book and Finish a series', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    fireEvent.change(select('What counts'), { target: { value: 'genre' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ and also' }))
    const second = select('And also')
    const labels = [...second.options].map((o) => o.textContent)
    expect(labels).not.toContain('Any book')
    expect(labels).not.toContain('Finish a series')
    expect(labels).not.toContain('A genre')
    expect(screen.getByRole('group', { name: 'What else counts' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove the second rule' }))
    expect(screen.queryByLabelText('And also')).toBeNull()
  })

  it('offers no second rule for Any book or Finish a series', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    expect(screen.queryByRole('button', { name: '＋ and also' })).toBeNull()
    fireEvent.change(select('What counts'), { target: { value: 'genre' } })
    expect(screen.getByRole('button', { name: '＋ and also' })).toBeTruthy()
    fireEvent.change(select('What counts'), { target: { value: 'finishseries' } })
    expect(screen.queryByRole('button', { name: '＋ and also' })).toBeNull()
  })

  it('keeps Save disabled while a chosen rule has no value, the second one too', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    const save = () => screen.getByRole('button', { name: 'Save' })
    expect(save().hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Fantasy year' } })
    expect(save().hasAttribute('disabled')).toBe(false)
    fireEvent.change(select('What counts'), { target: { value: 'genre' } })
    expect(save().hasAttribute('disabled')).toBe(true)
    fireEvent.change(select('Which'), { target: { value: 'Fantasy' } })
    expect(save().hasAttribute('disabled')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '＋ and also' }))
    fireEvent.change(select('And also'), { target: { value: 'author' } })
    expect(save().hasAttribute('disabled')).toBe(true)
    fireEvent.change(screen.getByLabelText('Which, second rule'), { target: { value: 'Sarah J. Maas' } })
    expect(save().hasAttribute('disabled')).toBe(false)
  })

  it('writes no unit for Books and no second rule when there is none', () => {
    const onSave = vi.fn()
    render(<NewChallengeForm books={shelf} year={2026} onSave={onSave} onCancel={() => {}} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Plain' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    const saved = onSave.mock.calls[0][0] as OwnChallenge
    expect(saved).not.toHaveProperty('unit')
    expect(saved).not.toHaveProperty('and')
    expect(saved).toMatchObject({ name: 'Plain', target: 5, year: 2026, rule: 'any' })
  })

  it('saves a pages goal with its unit and an AND with its value', () => {
    const onSave = vi.fn()
    render(<NewChallengeForm books={shelf} year={2026} onSave={onSave} onCancel={() => {}} />)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pages' } })
    fireEvent.change(select('Unit'), { target: { value: 'pages' } })
    fireEvent.change(screen.getByLabelText('How many'), { target: { value: '2000' } })
    fireEvent.change(select('What counts'), { target: { value: 'genre' } })
    fireEvent.change(select('Which'), { target: { value: 'Fantasy' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ and also' }))
    fireEvent.change(select('And also'), { target: { value: 'rating4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave.mock.calls[0][0]).toMatchObject({ unit: 'pages', target: 2000, rule: 'genre', value: 'Fantasy', and: 'rating4' })
  })

  it('lets the number go up to 100000 for pages and back to 500 for books', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    const amount = screen.getByLabelText('How many') as HTMLInputElement
    expect(amount.max).toBe('500')
    fireEvent.change(select('Unit'), { target: { value: 'pages' } })
    expect(amount.max).toBe('100000')
  })

  it('clears the second rule when the first becomes the same rule', () => {
    render(<NewChallengeForm books={shelf} year={2026} onSave={() => {}} onCancel={() => {}} />)
    fireEvent.change(select('What counts'), { target: { value: 'genre' } })
    fireEvent.click(screen.getByRole('button', { name: '＋ and also' }))
    fireEvent.change(select('And also'), { target: { value: 'author' } })
    fireEvent.change(select('What counts'), { target: { value: 'author' } })
    expect(screen.queryByLabelText('And also')).toBeNull()
  })

  it('opens a challenge saved before the new rules with Books and no second rule, and saves it back unchanged', () => {
    const old: OwnChallenge = { id: 'old1', name: 'Fantasy year', target: 5, year: 2026, rule: 'genre', value: 'Fantasy' }
    const onSave = vi.fn()
    render(<NewChallengeForm books={shelf} year={2026} start={old} onSave={onSave} onCancel={() => {}} />)
    expect(select('Unit').value).toBe('books')
    expect(screen.queryByLabelText('And also')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave.mock.calls[0][0]).toEqual(old)
  })
})

describe('the challenge card', () => {
  const card = (c: Partial<OwnChallenge>) => (
    <OwnChallengeCard
      challenge={{ id: 'c1', name: 'Test', target: 5, year: 2026, rule: 'any', ...c }}
      books={shelf}
      onShowBook={() => {}}
      editable
      onChange={() => {}}
      onDelete={() => {}}
    />
  )

  it('reads the rule as one sentence', () => {
    render(card({ rule: 'genre', value: 'Fantasy', and: 'author', andValue: 'Sarah J. Maas' }))
    expect(screen.getByText('Fantasy books by Sarah J. Maas')).toBeTruthy()
    cleanup()
    render(card({ rule: 'decade', value: '1990' }))
    expect(screen.getByText('Books from the 1990s')).toBeTruthy()
    cleanup()
    render(card({ rule: 'rating4' }))
    expect(screen.getByText('Books you rated 4+')).toBeTruthy()
    cleanup()
    render(card({ rule: 'genre', value: 'Fantasy', and: 'rating4' }))
    expect(screen.getByText('Fantasy books you rated 4+')).toBeTruthy()
  })

  it('counts in its unit', () => {
    render(card({ rule: 'any', unit: 'pages', target: 2000 }))
    expect(screen.getByText('1,200 of 2,000 pages')).toBeTruthy()
    cleanup()
    render(card({ rule: 'any', unit: 'hours', target: 20 }))
    expect(screen.getByText('10 of 20 hours')).toBeTruthy()
    cleanup()
    render(card({ rule: 'genre', value: 'Fantasy', target: 5 }))
    expect(screen.getByText('2 of 5')).toBeTruthy()
  })

  it('shows an AND that nothing matches as empty, with no extra sentence', () => {
    render(card({ rule: 'genre', value: 'Fantasy', and: 'language', andValue: 'nl', target: 5 }))
    expect(screen.getByText('0 of 5')).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('never draws a bar past full, not even for a goal of 1 page', () => {
    render(card({ rule: 'any', unit: 'pages', target: 1 }))
    const bar = screen.getByRole('progressbar').querySelector('span') as HTMLElement
    expect(bar.style.width).toBe('100%')
  })
})
