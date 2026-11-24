import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { WaitingCard } = await import('./WaitingCard')

/**
 * The garden's line in "Waiting for you" (T-0066, D-0050 §11): what has grown
 * or unlocked since this device last looked, with the way into the garden.
 */

afterEach(cleanup)

const card = (garden?: { line: string; onVisit: () => void }) =>
  render(<WaitingCard toRate={[]} questions={[]} onUpdate={() => {}} onShowBook={() => {}} garden={garden} />)

describe('the garden in "Waiting for you"', () => {
  it('says what has happened and offers the way in', () => {
    const onVisit = vi.fn()
    card({ line: 'In your garden: 2 new plants and a pond has unlocked.', onVisit })
    expect(screen.getByText('In your garden: 2 new plants and a pond has unlocked.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Visit garden' }))
    expect(onVisit).toHaveBeenCalledOnce()
  })

  it('says nothing at all when the garden has no news', () => {
    card()
    expect(screen.queryByRole('button', { name: 'Visit garden' })).toBeNull()
  })
})
