import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShelfPanButtons } from './ShelfPanButtons'

const middle = { canPan: true, atStart: false, atEnd: false }

describe('ShelfPanButtons', () => {
  afterEach(cleanup)

  it('is not rendered when the shelf cannot pan', () => {
    const { container } = render(<ShelfPanButtons pan={{ canPan: false, atStart: false, atEnd: false }} onStep={() => {}} />)
    expect(container.innerHTML).toBe('')
    const empty = render(<ShelfPanButtons pan={null} onStep={() => {}} />)
    expect(empty.container.innerHTML).toBe('')
  })

  it('has accessible names, tooltips naming the keys, and a group', () => {
    render(<ShelfPanButtons pan={middle} onStep={() => {}} />)
    expect(screen.getByRole('group', { name: 'Move along the shelf' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show books to the left' }).getAttribute('title')).toBe(
      'Show books to the left (← key)',
    )
    expect(screen.getByRole('button', { name: 'Show books to the right' }).getAttribute('title')).toBe(
      'Show books to the right (→ key)',
    )
  })

  it('puts ‹ before › in the tab order', () => {
    render(<ShelfPanButtons pan={middle} onStep={() => {}} />)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual(['Show books to the left', 'Show books to the right'])
  })

  it('enables both in the middle', () => {
    render(<ShelfPanButtons pan={middle} onStep={() => {}} />)
    for (const b of screen.getAllByRole('button')) {
      expect(b.getAttribute('aria-disabled')).toBeNull()
      expect(b.hasAttribute('disabled')).toBe(false)
    }
  })

  it('disables ‹ at the start and › at the end with aria-disabled, keeping them focusable', () => {
    const onStep = vi.fn()
    const { rerender } = render(<ShelfPanButtons pan={{ ...middle, atStart: true }} onStep={onStep} />)
    const left = screen.getByRole('button', { name: 'Show books to the left' })
    expect(left.getAttribute('aria-disabled')).toBe('true')
    expect(left.hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Show books to the right' }).getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(left)
    expect(onStep).not.toHaveBeenCalled()

    rerender(<ShelfPanButtons pan={{ ...middle, atEnd: true }} onStep={onStep} />)
    const right = screen.getByRole('button', { name: 'Show books to the right' })
    expect(right.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Show books to the left' }).getAttribute('aria-disabled')).toBeNull()
    right.focus()
    fireEvent.click(right)
    expect(onStep).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(right)
  })

  it('asks for one step to the right on ›, one to the left on ‹', () => {
    const onStep = vi.fn()
    render(<ShelfPanButtons pan={middle} onStep={onStep} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show books to the right' }))
    expect(onStep).toHaveBeenLastCalledWith(1)
    fireEvent.click(screen.getByRole('button', { name: 'Show books to the left' }))
    expect(onStep).toHaveBeenLastCalledWith(-1)
    expect(onStep).toHaveBeenCalledTimes(2)
  })
})
