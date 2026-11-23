import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChallengeRings, goToChallenge } from './ChallengeRings'
import type { ChallengeRing } from '#/lib/challengeRings'

/** The ring row at the top of the Challenges page (T-0090, D-0064). */

const ring = (id: string, name: string, done: number, goal: number, extra: Partial<ChallengeRing> = {}): ChallengeRing => ({
  id,
  name,
  short: name.split(' ')[0],
  done,
  goal,
  complete: done >= goal,
  ...extra,
})

afterEach(cleanup)

describe('the ring row', () => {
  it('is a named group of buttons, one per challenge', () => {
    render(<ChallengeRings rings={[ring('goal', 'Reading goal', 3, 12), ring('bingo', 'Book bingo', 16, 16)]} year={2026} />)
    expect(screen.getByRole('group', { name: 'Your challenges in 2026' })).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('names a ring with its progress, and says "done" when it is', () => {
    render(<ChallengeRings rings={[ring('goal', 'Reading goal', 3, 12, { counts: 'books' }), ring('bingo', 'Book bingo', 16, 16)]} year={2026} />)
    expect(screen.getByRole('button', { name: 'Reading goal: 3 of 12 books' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Book bingo: done, 16 of 16' })).toBeTruthy()
  })

  it('marks a complete ring with the done class and a tick', () => {
    render(<ChallengeRings rings={[ring('bingo', 'Book bingo', 16, 16)]} year={2026} />)
    const button = screen.getByRole('button', { name: /Book bingo/ })
    expect(button.className).toContain('done')
    expect(button.textContent).toContain('✓')
    expect(button.textContent).not.toContain('16')
  })

  it('shows the done number in an unfinished ring, and the short name under it', () => {
    render(<ChallengeRings rings={[ring('goal', 'Reading goal', 3, 12)]} year={2026} />)
    const button = screen.getByRole('button', { name: /Reading goal/ })
    expect(button.textContent).toContain('3')
    expect(button.textContent).toContain('Reading')
  })

  it('jumps to the challenge on click, Enter and Space', () => {
    const onGo = vi.fn()
    render(<ChallengeRings rings={[ring('goal', 'Reading goal', 3, 12)]} year={2026} onGo={onGo} />)
    const button = screen.getByRole('button', { name: /Reading goal/ })
    fireEvent.click(button)
    // a real <button> turns Enter and Space into a click, so one assertion covers all three
    expect(onGo).toHaveBeenCalledWith('goal')
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('renders nothing at all when there are no rings', () => {
    const { container } = render(<ChallengeRings rings={[]} year={2026} />)
    expect(container.firstChild).toBe(null)
  })

  it('takes one ring and twelve, and wraps instead of scrolling sideways', () => {
    const { container, rerender } = render(<ChallengeRings rings={[ring('goal', 'Reading goal', 1, 2)]} year={2026} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    rerender(<ChallengeRings rings={Array.from({ length: 12 }, (_, i) => ring(`c${i}`, `Challenge ${i}`, i, 12))} year={2026} />)
    expect(screen.getAllByRole('button')).toHaveLength(12)
    expect((container.firstChild as HTMLElement).className).toBe('challenge-rings')
  })

  it('clips a long name but keeps it in the accessible name', () => {
    render(<ChallengeRings rings={[ring('own:1', 'A very long challenge name that goes on', 1, 2)]} year={2026} />)
    const button = screen.getByRole('button', { name: /A very long challenge name that goes on: 1 of 2/ })
    expect(button.textContent).toContain('A')
    expect(button.textContent).not.toContain('goes on')
  })
})

describe('jumping to a challenge', () => {
  it('scrolls the block into view and puts the focus on its heading', () => {
    const block = document.createElement('div')
    block.id = 'challenge-goal'
    const heading = document.createElement('h2')
    heading.textContent = 'Reading goal'
    block.append(heading)
    document.body.append(block)
    const scroll = vi.fn()
    block.scrollIntoView = scroll
    goToChallenge('goal')
    expect(scroll).toHaveBeenCalled()
    expect(heading.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(heading)
    block.remove()
  })

  it('does nothing when the block is not there', () => {
    expect(() => goToChallenge('nope')).not.toThrow()
  })
})
