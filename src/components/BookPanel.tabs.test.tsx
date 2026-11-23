import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { BookPanel } from './BookPanel'

/**
 * T-0047 / D-0041: the book panel is four tabs — Reading, Notes, Details, Looks —
 * it opens on Reading every time, and switching tab never loses what she typed.
 */

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

const tab = (name: string) => screen.getByRole('tab', { name })
const open = (name: string) => fireEvent.click(tab(name))
const openTabName = () => screen.getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true')?.textContent

afterEach(cleanup)

describe('the tab row', () => {
  it('has the four tabs in order, in a tablist', () => {
    show(book())
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Book details')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Reading', 'Notes', 'Details', 'Looks'])
  })

  it('opens on Reading for a want-to-read, a reading and a finished book', () => {
    for (const status of ['want', 'reading', 'read'] as const) {
      show(book({ status, readCount: status === 'read' ? 1 : undefined }))
      expect(openTabName()).toBe('Reading')
      cleanup()
    }
  })

  it('shows Reading again for the next book, after Details was open', () => {
    const { rerender } = show(book())
    open('Details')
    expect(openTabName()).toBe('Details')
    rerender(
      <BookPanel
        book={book({ id: 'b2', title: 'Another' })}
        onFace={() => {}}
        onStatus={() => {}}
        onProgress={() => {}}
        onUpdate={() => {}}
        genreOptions={[]}
        onChangeCover={() => {}}
        shelf={[]}
        onMerge={() => {}}
        onRemove={() => {}}
        onClose={() => {}}
      />,
    )
    expect(openTabName()).toBe('Reading')
  })

  it('shows Reading again when the same book is closed and opened again', () => {
    show(book())
    open('Looks')
    cleanup()
    show(book())
    expect(openTabName()).toBe('Reading')
  })

  it('keeps only the open tab in the tab order, and moves with the arrow keys, Home and End', () => {
    show(book())
    expect(tab('Reading').tabIndex).toBe(0)
    expect(tab('Notes').tabIndex).toBe(-1)
    fireEvent.keyDown(tab('Reading'), { key: 'ArrowRight' })
    expect(openTabName()).toBe('Notes')
    fireEvent.keyDown(tab('Notes'), { key: 'ArrowLeft' })
    expect(openTabName()).toBe('Reading')
    // wrapping round
    fireEvent.keyDown(tab('Reading'), { key: 'ArrowLeft' })
    expect(openTabName()).toBe('Looks')
    fireEvent.keyDown(tab('Looks'), { key: 'Home' })
    expect(openTabName()).toBe('Reading')
    fireEvent.keyDown(tab('Reading'), { key: 'End' })
    expect(openTabName()).toBe('Looks')
  })

  it('gives every tab panel a role and its tab as its label', () => {
    show(book())
    for (const name of ['Reading', 'Notes', 'Details', 'Looks']) {
      open(name)
      const panel = screen.getByRole('tabpanel')
      expect(panel.getAttribute('aria-labelledby')).toBe(tab(name).id)
    }
  })
})

describe('what is on each tab', () => {
  const finished = book({ status: 'read', readCount: 1, progress: 0.5 })

  it('Reading holds the status, the progress and the rating, and nothing else', () => {
    show(book({ status: 'reading', progress: 0.5 }))
    expect(screen.getByRole('slider', { name: 'Progress' })).toBeTruthy()
    cleanup()
    show(finished)
    expect(screen.getByText('Rating')).toBeTruthy()
    expect(screen.queryByText('Genres')).toBeNull()
    expect(screen.queryByText('Journal')).toBeNull()
    expect(screen.queryByText('Page edges')).toBeNull()
  })

  it('Notes holds the tropes, the characters and lent to a friend', () => {
    show(finished)
    open('Notes')
    expect(screen.getByText('Tropes')).toBeTruthy()
    expect(screen.getByText('Characters')).toBeTruthy()
    expect(screen.getByText('Lent to a friend')).toBeTruthy()
    expect(screen.queryByText('Genres')).toBeNull()
  })

  it('Details holds the formats, the series, the genres, the back cover and the merge section, last', () => {
    show(finished)
    open('Details')
    expect(screen.getByText('How I have it')).toBeTruthy()
    expect(screen.getByLabelText('Series name')).toBeTruthy()
    expect(screen.getByText('Genres')).toBeTruthy()
    expect(screen.getByText('Back cover')).toBeTruthy()
    const panel = screen.getByRole('tabpanel')
    const texts = panel.textContent ?? ''
    expect(texts.indexOf('Back cover')).toBeLessThan(texts.length)
    expect(screen.queryByText('Lent to a friend')).toBeNull()
  })

  it('Looks holds the sides, Change cover and the page edges', () => {
    show(finished)
    open('Looks')
    expect(screen.getByRole('group', { name: 'Show side' })).toBeTruthy()
    expect(screen.getByText('Change cover…')).toBeTruthy()
    expect(screen.queryByText('How I have it')).toBeNull()
  })

  it('keeps the title, the byline, ×, Put back and Remove on every tab', () => {
    show(finished)
    for (const name of ['Reading', 'Notes', 'Details', 'Looks']) {
      open(name)
      expect(screen.getByRole('heading', { name: /The Book/ })).toBeTruthy()
      expect(screen.getByText('A Writer')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Put back on the shelf' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Put back' })).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy()
    }
  })
})

describe('switching tab never loses what she typed', () => {
  it('saves a half-typed series name, lent name and back cover', () => {
    const onUpdate = vi.fn()
    const b = book({ lent: { to: 'Mo' } })
    show(b, onUpdate)
    open('Details')
    fireEvent.change(screen.getByLabelText('Series name'), { target: { value: 'Crescent City' } })
    fireEvent.change(screen.getByLabelText('Back cover'), { target: { value: 'A very long night.' } })
    open('Notes')
    const patches = onUpdate.mock.calls.map((c) => c[0])
    expect(patches.some((p) => p.series === 'Crescent City')).toBe(true)
    expect(patches.some((p) => p.description === 'A very long night.')).toBe(true)
    onUpdate.mockClear()
    fireEvent.change(screen.getByLabelText('To'), { target: { value: 'Robin' } })
    open('Reading')
    expect(onUpdate.mock.calls.map((c) => c[0]).some((p) => p.lent?.to === 'Robin')).toBe(true)
  })
})
