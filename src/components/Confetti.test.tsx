import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONFETTI_MS, ConfettiLayer, confetti } from './Confetti'

/** The confetti burst (T-0090, D-0064 §4). */

const matchReduced = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  vi.useFakeTimers()
  matchReduced(false)
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('the confetti layer', () => {
  it('does nothing and throws nothing with no layer on the page', () => {
    expect(() => confetti()).not.toThrow()
  })

  it('draws one burst per call and clears it away afterwards', () => {
    const { container } = render(<ConfettiLayer />)
    expect(container.firstChild).toBe(null)
    act(() => confetti())
    expect(container.querySelectorAll('.confetti-burst')).toHaveLength(1)
    expect(container.querySelectorAll('.confetti-bit').length).toBeGreaterThan(20)
    act(() => confetti())
    expect(container.querySelectorAll('.confetti-burst')).toHaveLength(2)
    act(() => void vi.advanceTimersByTime(CONFETTI_MS + 500))
    expect(container.firstChild).toBe(null)
  })

  it('holds nothing focusable and is hidden from a screen reader', () => {
    const { container } = render(<ConfettiLayer />)
    act(() => confetti())
    const layer = container.querySelector('.confetti-layer')!
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0)
  })

  it('draws nothing when she asked for less movement', () => {
    matchReduced(true)
    const { container } = render(<ConfettiLayer />)
    act(() => confetti())
    expect(container.firstChild).toBe(null)
  })
})
