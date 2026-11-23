import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { CharactersField, TropesField } from './TropesField'

/** T-0048 / D-0042: the tropes and characters fields on the book panel's Notes tab. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b', title: 'T', authors: [], color: '#000', status: 'read', addedAt: 1, ...over }) as Book

afterEach(cleanup)

describe('Tropes', () => {
  it('joins the spelling the shelf already uses', () => {
    const onUpdate = vi.fn()
    const shelf = [book({ id: 'other', tropes: ['Enemies to lovers'] })]
    render(<TropesField book={book()} shelf={shelf} onUpdate={onUpdate} />)
    const field = screen.getByLabelText('Add a trope')
    fireEvent.change(field, { target: { value: 'ENEMIES TO LOVERS' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith({ tropes: ['Enemies to lovers'] })
  })

  it('shows her tropes as chips and takes one off again', () => {
    const onUpdate = vi.fn()
    const b = book({ tropes: ['Found family', 'Slow burn'] })
    render(<TropesField book={b} shelf={[b]} onUpdate={onUpdate} />)
    expect(screen.getByText('Found family')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Remove Found family'))
    expect(onUpdate).toHaveBeenCalledWith({ tropes: ['Slow burn'] })
  })

  it('offers the ready list to tap as soon as the field has focus', () => {
    const onUpdate = vi.fn()
    render(<TropesField book={book()} shelf={[]} onUpdate={onUpdate} />)
    fireEvent.focus(screen.getByLabelText('Add a trope'))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options.length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('option', { name: options[0]! }))
    expect(onUpdate).toHaveBeenCalledWith({ tropes: [options[0]] })
  })

  it('adds nothing for an empty field or a trope the book already has', () => {
    const onUpdate = vi.fn()
    const b = book({ tropes: ['Slow burn'] })
    render(<TropesField book={b} shelf={[b]} onUpdate={onUpdate} />)
    const field = screen.getByLabelText('Add a trope')
    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    fireEvent.change(field, { target: { value: 'slow burn' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

describe('Characters', () => {
  it('adds a name and refuses the same one twice', () => {
    const onUpdate = vi.fn()
    const b = book({ characters: [{ name: 'Feyre' }] })
    render(<CharactersField book={b} onUpdate={onUpdate} />)
    const field = screen.getByLabelText('Add a character')
    fireEvent.change(field, { target: { value: 'feyre' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onUpdate).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: 'Rhysand' } })
    fireEvent.keyDown(field, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith({ characters: [{ name: 'Feyre' }, { name: 'Rhysand' }] })
  })

  it('sets a ♥ and clears it, saying what the button does', () => {
    const onUpdate = vi.fn()
    const b = book({ characters: [{ name: 'Feyre' }] })
    const { rerender } = render(<CharactersField book={b} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByLabelText('Favourite: Feyre'))
    expect(onUpdate).toHaveBeenCalledWith({ characters: [{ name: 'Feyre', fav: true }] })
    const loved = book({ characters: [{ name: 'Feyre', fav: true }] })
    rerender(<CharactersField book={loved} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByLabelText('Not a favourite any more: Feyre'))
    expect(onUpdate).toHaveBeenCalledWith({ characters: [{ name: 'Feyre' }] })
  })

  it('removes a character', () => {
    const onUpdate = vi.fn()
    const b = book({ characters: [{ name: 'Feyre' }, { name: 'Nesta' }] })
    render(<CharactersField book={b} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByLabelText('Remove Nesta'))
    expect(onUpdate).toHaveBeenCalledWith({ characters: [{ name: 'Feyre' }] })
  })
})
