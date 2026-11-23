import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { BookPanel } from './BookPanel'

/** T-0052 / D-0044: the pose picker on the book panel's Looks tab. */

const book = (over: Partial<Book> = {}): Book =>
  ({
    id: 'b1',
    title: 'The Book',
    authors: ['A Writer'],
    color: '#2e5a8a',
    status: 'reading',
    addedAt: 1,
    ...over,
  }) as Book

function show(b: Book, onUpdate: (patch: Partial<Book>) => void = () => {}) {
  return render(
    <BookPanel
      book={b}
      onFace={() => {}}
      onStatus={() => {}}
      onProgress={() => {}}
      onUpdate={onUpdate}
      genreOptions={['Fantasy']}
      onChangeCover={() => {}}
      shelf={[b]}
      onMerge={() => {}}
      onRemove={() => {}}
      onClose={() => {}}
    />,
  )
}

const openLooks = () => fireEvent.click(screen.getByRole('tab', { name: 'Looks' }))

afterEach(cleanup)

describe('How it stands', () => {
  it('is on Looks, above the side picker, with her three words', () => {
    show(book())
    openLooks()
    const group = screen.getByRole('group', { name: 'How it stands' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Standing', 'Face-out', 'Lying flat'])
    // before Front / Spine / Back
    const looks = screen.getByRole('tabpanel')
    const order = within(looks)
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(order.indexOf('Standing')).toBeLessThan(order.indexOf('Front'))
  })

  it('shows Standing pressed for a book she has never posed', () => {
    show(book())
    openLooks()
    expect(screen.getByRole('button', { name: 'Standing' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Lying flat' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the pose the book has', () => {
    show(book({ pose: 'faceout' }))
    openLooks()
    expect(screen.getByRole('button', { name: 'Face-out' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Standing' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('saves the pose she picks', () => {
    const onUpdate = vi.fn()
    show(book(), onUpdate)
    openLooks()
    fireEvent.click(screen.getByRole('button', { name: 'Lying flat' }))
    expect(onUpdate).toHaveBeenCalledWith({ pose: 'flat' })
  })

  it('clears the field when she puts a posed book back to Standing', () => {
    const onUpdate = vi.fn()
    show(book({ pose: 'flat' }), onUpdate)
    openLooks()
    fireEvent.click(screen.getByRole('button', { name: 'Standing' }))
    expect(onUpdate).toHaveBeenCalledWith({ pose: undefined })
  })

  it('does nothing when she taps the pose the book already has', () => {
    const onUpdate = vi.fn()
    show(book({ pose: 'flat' }), onUpdate)
    openLooks()
    fireEvent.click(screen.getByRole('button', { name: 'Lying flat' }))
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('is not on the other three tabs, and the panel still opens on Reading', () => {
    show(book())
    expect(screen.getByRole('tab', { name: 'Reading' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByRole('group', { name: 'How it stands' })).toBeNull()
    for (const name of ['Notes', 'Details']) {
      fireEvent.click(screen.getByRole('tab', { name }))
      expect(screen.queryByRole('group', { name: 'How it stands' })).toBeNull()
    }
  })
})
