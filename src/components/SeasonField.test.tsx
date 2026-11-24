import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { SeasonField } from './SeasonField'

/** The seasons she gives a book herself (#272, D-0072). */

const book = (over: Partial<Book> = {}): Book =>
  ({
    id: 'b1',
    title: 'Kerst op een Eiland',
    authors: ['A. Writer'],
    color: '#7a4f3a',
    status: 'reading',
    addedAt: 1,
    genres: ['Romance'],
    ...over,
  }) as Book

const show = (b: Book, onUpdate: (patch: Partial<Book>) => void = () => {}) =>
  render(<SeasonField book={b} onUpdate={onUpdate} />)

const chip = (name: string) => screen.getByRole('button', { name: new RegExp(name) })

afterEach(cleanup)

describe('the Season field', () => {
  it('offers the four seasons, none of them on for a book she has not touched', () => {
    show(book())
    const group = screen.getByRole('group', { name: 'Season' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent?.trim())).toEqual([
      '🌸 Spring',
      '☀️ Summer',
      '🍂 Autumn',
      '❄️ Winter',
    ])
    expect(within(group).getAllByRole('button').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true)
  })

  it('says that an empty field leaves the app to work it out', () => {
    show(book())
    expect(screen.getByText('No season picked: worked out from the genres and tropes.')).toBeTruthy()
  })

  it('picks a season, and says what it now counts for', () => {
    const onUpdate = vi.fn()
    show(book(), onUpdate)
    fireEvent.click(chip('Winter'))
    expect(onUpdate).toHaveBeenCalledWith({ seasons: ['winter'] })
    cleanup()
    show(book({ seasons: ['winter'] }))
    expect(chip('Winter').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Counts for winter only.')).toBeTruthy()
  })

  it('adds a second season and names both, in season order', () => {
    const onUpdate = vi.fn()
    show(book({ seasons: ['winter'] }), onUpdate)
    fireEvent.click(chip('Autumn'))
    expect(onUpdate).toHaveBeenCalledWith({ seasons: ['autumn', 'winter'] })
    cleanup()
    show(book({ seasons: ['winter', 'autumn'] }))
    expect(screen.getByText('Counts for autumn and winter only.')).toBeTruthy()
  })

  it('takes a season off again, and clears the field with the last one', () => {
    const onUpdate = vi.fn()
    show(book({ seasons: ['autumn', 'winter'] }), onUpdate)
    fireEvent.click(chip('Autumn'))
    expect(onUpdate).toHaveBeenCalledWith({ seasons: ['winter'] })
    cleanup()
    onUpdate.mockClear()
    show(book({ seasons: ['winter'] }), onUpdate)
    fireEvent.click(chip('Winter'))
    // never an empty list: the field goes away, so the book is what it was (D-0072 §1)
    expect(onUpdate).toHaveBeenCalledWith({ seasons: undefined })
  })

  it('ignores a season on the book that is not one of the four', () => {
    show(book({ seasons: ['christmas'] as unknown as Book['seasons'] }))
    expect(screen.getByText('No season picked: worked out from the genres and tropes.')).toBeTruthy()
  })
})
