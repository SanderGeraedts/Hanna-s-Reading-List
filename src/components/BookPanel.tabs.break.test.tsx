import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { BookPanel } from './BookPanel'

/** Tester, T-0047: gap tests on the tab row. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b1', title: 'The Book', authors: ['A Writer'], color: '#2e5a8a', status: 'reading', addedAt: 1, ...over }) as Book

function show(b: Book, onUpdate: (patch: Partial<Book>) => void = () => {}, onClose = () => {}) {
  return render(
    <BookPanel
      book={b}
      onFace={() => {}}
      onStatus={() => {}}
      onProgress={() => {}}
      onUpdate={onUpdate}
      genreOptions={[]}
      onChangeCover={() => {}}
      shelf={[b]}
      onMerge={() => {}}
      onRemove={() => {}}
      onClose={onClose}
    />,
  )
}

const tab = (name: string) => screen.getByRole('tab', { name })
const openTabName = () => screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent

afterEach(cleanup)

describe('the tab row, trying to break it', () => {
  it('survives the same tab tapped twice and a quick run round all four', () => {
    show(book())
    fireEvent.click(tab('Notes'))
    fireEvent.click(tab('Notes'))
    expect(openTabName()).toBe('Notes')
    for (const name of ['Details', 'Looks', 'Reading', 'Notes', 'Details', 'Looks']) fireEvent.click(tab(name))
    expect(openTabName()).toBe('Looks')
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('moves focus with the arrow key, not only the open tab', () => {
    show(book())
    tab('Reading').focus()
    fireEvent.keyDown(tab('Reading'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tab('Notes'))
    expect(tab('Notes').tabIndex).toBe(0)
    expect(tab('Reading').tabIndex).toBe(-1)
  })

  it('ignores the keys it has no business with', () => {
    show(book())
    for (const key of ['ArrowUp', 'ArrowDown', 'PageDown', 'a', ' ']) {
      fireEvent.keyDown(tab('Reading'), { key })
    }
    expect(openTabName()).toBe('Reading')
  })

  it('still saves what she typed when the panel closes from another tab', () => {
    const onUpdate = vi.fn()
    const { unmount } = show(book(), onUpdate)
    fireEvent.click(tab('Details'))
    fireEvent.change(screen.getByLabelText('Series name'), { target: { value: 'Throne of Glass' } })
    onUpdate.mockClear()
    unmount()
    expect(onUpdate.mock.calls.map((c) => c[0]).some((p) => p.series === 'Throne of Glass')).toBe(true)
  })

  it('keeps the tropes and characters she added while the tab stays open', () => {
    const onUpdate = vi.fn()
    show(book(), onUpdate)
    fireEvent.click(tab('Notes'))
    const trope = screen.getByLabelText('Add a trope')
    fireEvent.change(trope, { target: { value: 'heist' } })
    fireEvent.keyDown(trope, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith({ tropes: ['Heist'] })
    const name = screen.getByLabelText('Add a character')
    fireEvent.change(name, { target: { value: 'Kaz' } })
    fireEvent.keyDown(name, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith({ characters: [{ name: 'Kaz' }] })
  })
})
