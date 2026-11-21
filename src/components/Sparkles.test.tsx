import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { SparkleLayer, sparkle } from './Sparkles'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('little magic moments: sparkles', () => {
  it('draws nothing until asked, then a burst that goes away again', () => {
    vi.useFakeTimers()
    const { container } = render(<SparkleLayer />)
    expect(container.querySelector('.sparkle-layer')).toBeNull()
    act(() => sparkle())
    expect(container.querySelectorAll('.sparkle-bit').length).toBe(26)
    expect(container.querySelector('.sparkle-layer')?.getAttribute('aria-hidden')).toBe('true')
    act(() => vi.advanceTimersByTime(2000))
    expect(container.querySelector('.sparkle-layer')).toBeNull()
  })

  it('bursts where it is asked to', () => {
    const { container } = render(<SparkleLayer />)
    act(() => sparkle({ x: 40, y: 50 }))
    const burst = container.querySelector<HTMLElement>('.sparkle-burst')!
    expect(burst.style.left).toBe('40px')
    expect(burst.style.top).toBe('50px')
  })
})
