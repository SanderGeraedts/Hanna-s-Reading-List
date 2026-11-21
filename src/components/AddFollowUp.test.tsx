import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { AddFollowUp } from './AddFollowUp'
import type { FollowUpHandle } from './AddFollowUp'

afterEach(cleanup)

const added = (extra: Partial<Book> = {}): Book => ({
  id: 'b1',
  title: 'The Name of the Wind',
  authors: ['Patrick Rothfuss'],
  color: '#884422',
  status: 'want',
  addedAt: 1,
  ...extra,
})

/** the follow-up with a shelf of one book, the way the add dialog uses it */
function setup(initial: Partial<Book> = {}, from = 'search') {
  const state = { book: added(initial), done: 0 }
  const handle = createRef<FollowUpHandle>()
  function Harness() {
    const [book, setBook] = useState(state.book)
    const [open, setOpen] = useState(true)
    if (!open) return null
    return (
      <AddFollowUp
        book={book}
        from={from}
        handle={handle}
        onUpdate={(_id, patch) => {
          state.book = { ...state.book, ...patch }
          setBook(state.book)
        }}
        onDone={() => {
          state.done++
          setOpen(false)
        }}
      />
    )
  }
  render(<Harness />)
  return { state, handle }
}

const chip = (name: string) => screen.getByRole('button', { name })
const price = () => screen.queryByLabelText('What did it cost? (euros)') as HTMLInputElement | null

describe('the follow-up after adding a book (T-0016)', () => {
  it('says what was added and asks the price only while a bought format is ticked', () => {
    const { state } = setup()
    expect(screen.getByRole('status').textContent).toBe('Added “The Name of the Wind”.')
    expect(price()).toBeNull()
    fireEvent.click(chip('From the library'))
    expect(price()).toBeNull()
    fireEvent.click(chip('Hardcover'))
    expect(state.book.formats).toEqual(['hardcover', 'library'])
    expect(price()).not.toBeNull()
    expect(price()!.inputMode).toBe('decimal')
    fireEvent.click(chip('Hardcover'))
    expect(price()).toBeNull()
  })

  it('starts with the price field after a scan, and Done saves the price', () => {
    const { state } = setup({ formats: ['paperback'] }, 'scan')
    expect(document.activeElement).toBe(price())
    fireEvent.change(price()!, { target: { value: '12,50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(state.book.price).toBe(12.5)
    expect(state.done).toBe(1)
  })

  it('shows the error for a wrong price and keeps it out', () => {
    const { state } = setup({ formats: ['paperback'] })
    fireEvent.change(price()!, { target: { value: 'twelve' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Try 12.50 or 12,50.')).toBeTruthy()
    expect(price()!.getAttribute('aria-invalid')).toBe('true')
    expect(state.book.price).toBeUndefined()
    expect(state.done).toBe(0)
    fireEvent.change(price()!, { target: { value: '10000' } })
    fireEvent.keyDown(price()!, { key: 'Enter' })
    expect(screen.getByText('That’s more than €9,999.99.')).toBeTruthy()
  })

  it('Skip leaves the book without a price, even one saved on leaving the field', () => {
    const { state } = setup({ formats: ['ebook'] })
    fireEvent.change(price()!, { target: { value: '7.99' } })
    fireEvent.blur(price()!)
    expect(state.book.price).toBe(7.99)
    expect(price()!.value).toBe('7.99')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(state.book.price).toBeUndefined()
    expect(state.book.formats).toEqual(['ebook'])
  })

  it('an e-book at €0 goes on to the link, refuses javascript:, and Skip keeps the €0', () => {
    const { state } = setup({ formats: ['ebook'] })
    fireEvent.change(price()!, { target: { value: '0,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(state.book.price).toBe(0)
    const link = screen.getByLabelText('E-book link') as HTMLInputElement
    expect(document.activeElement).toBe(link)
    fireEvent.change(link, { target: { value: 'javascript:x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Only links that start with https:// or http:// can be opened here.')).toBeTruthy()
    expect(state.book.ebookUrl).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(state.book.price).toBe(0)
    expect(state.done).toBe(1)
  })

  it('Done saves a good e-book link', () => {
    const { state } = setup({ formats: ['ebook'] })
    fireEvent.change(price()!, { target: { value: '0' } })
    fireEvent.keyDown(price()!, { key: 'Enter' })
    const link = screen.getByLabelText('E-book link')
    fireEvent.change(link, { target: { value: 'https://example.com/book.epub' } })
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(state.book.ebookUrl).toBe('https://example.com/book.epub')
    expect(state.done).toBe(1)
  })

  it('a paperback at €0 just closes with Done', () => {
    const { state } = setup({ formats: ['paperback'] })
    fireEvent.change(price()!, { target: { value: '0' } })
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(state.book.price).toBe(0)
    expect(state.done).toBe(1)
  })

  it('closing early keeps a valid typed price and drops a wrong one', () => {
    const first = setup({ formats: ['hardcover'] })
    fireEvent.change(price()!, { target: { value: '€ 24' } })
    first.handle.current!.flush()
    expect(first.state.book.price).toBe(24)
    cleanup()
    const second = setup({ formats: ['hardcover'] })
    fireEvent.change(price()!, { target: { value: '24,999' } })
    second.handle.current!.flush()
    expect(second.state.book.price).toBeUndefined()
  })

  it('unticking the last bought format drops a price saved in the follow-up (tester)', () => {
    const { state } = setup({ formats: ['paperback'] }, 'scan')
    fireEvent.change(price()!, { target: { value: '15' } })
    fireEvent.blur(price()!)
    expect(state.book.price).toBe(15)
    fireEvent.click(chip('Storytel'))
    expect(price()).not.toBeNull()
    fireEvent.click(chip('Paperback'))
    expect(price()).toBeNull()
    expect(state.book.price).toBeUndefined()
    expect(state.book.formats).toEqual(['storytel'])
  })

  it('switching the e-book off turns Next back into Done (tester)', () => {
    setup({ formats: ['ebook', 'paperback'] })
    fireEvent.change(price()!, { target: { value: '0' } })
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy()
    fireEvent.click(chip('E-book'))
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('never asks the price for a Storytel import, even with a paper format (tester)', () => {
    setup({ formats: ['paperback'] }, 'storytel')
    expect(price()).toBeNull()
  })
})
