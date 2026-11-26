import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { WaitingCard } from './WaitingCard'
import { troubleLine } from '#/lib/trouble'

/**
 * The failure that is still a failure waits in "Waiting for you" (D-0088),
 * never in a pop-up (D-0013): one line with what happened, what it means for
 * her books and what she can do.
 */

const base = { toRate: [], questions: [], onUpdate: () => {}, onShowBook: () => {} }

afterEach(cleanup)

describe('a failure in Waiting for you', () => {
  it('says nothing is waiting while nothing is wrong', () => {
    render(<WaitingCard {...base} />)
    expect(screen.getByText('Nothing waiting.')).toBeTruthy()
  })

  it('shows the three parts of the line when the shelf has not reached the server', () => {
    render(<WaitingCard {...base} trouble={{ kind: 'shelf-not-sent' }} />)
    const line = troubleLine('shelf-not-sent')
    expect(screen.getByText(line.what)).toBeTruthy()
    expect(screen.getByText(line.safe)).toBeTruthy()
    expect(screen.getByText(line.fix)).toBeTruthy()
    expect(screen.queryByText('Nothing waiting.')).toBeNull()
  })

  it('offers Try again, and only when there is something to try', () => {
    const onRetry = vi.fn()
    render(<WaitingCard {...base} trouble={{ kind: 'shelf-not-sent', onRetry }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalled()
    cleanup()
    // a shelf too big to send is not helped by trying again: no button, a way forward in words
    render(<WaitingCard {...base} trouble={{ kind: 'shelf-too-big', onRetry }} />)
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.getByText(troubleLine('shelf-too-big').fix)).toBeTruthy()
  })

  it('says it is trying while it tries', () => {
    render(<WaitingCard {...base} trouble={{ kind: 'shelf-not-sent', onRetry: () => {}, busy: true }} />)
    const button = screen.getByRole('button', { name: 'Trying…' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})
