import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { useArrangeBarHeight } from './useArrangeBarHeight'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Page({ bar }: { bar: boolean }) {
  const ref = useArrangeBarHeight()
  return (
    <div className="dashboard" data-testid="dashboard">
      <div className="challenges-page">{bar && <div className="dashboard-bar arranging" ref={ref} />}</div>
    </div>
  )
}

describe('useArrangeBarHeight (T-0035)', () => {
  it('sets the Arrange bar’s height as --arrange-h on the page’s .dashboard, and clears it when the bar goes', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 61.6 } as DOMRect)
    const { getByTestId, rerender } = render(<Page bar />)
    expect(getByTestId('dashboard').style.getPropertyValue('--arrange-h')).toBe('62px')
    rerender(<Page bar={false} />)
    expect(getByTestId('dashboard').style.getPropertyValue('--arrange-h')).toBe('')
  })

  it('follows the bar when it grows (the "Hidden:" chips wrap onto more rows) and shrinks again (tester)', () => {
    let fire = () => {}
    let disconnected = 0
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          fire = cb
        }
        observe() {}
        disconnect() {
          disconnected++
        }
      },
    )
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 62 } as DOMRect)
    const { getByTestId, unmount } = render(<Page bar />)
    const dash = () => getByTestId('dashboard').style.getPropertyValue('--arrange-h')
    expect(dash()).toBe('62px')
    rect.mockReturnValue({ height: 699.4 } as DOMRect)
    fire()
    expect(dash()).toBe('699px')
    rect.mockReturnValue({ height: 148.4 } as DOMRect)
    fire()
    expect(dash()).toBe('148px')
    unmount()
    expect(disconnected).toBe(1)
    vi.unstubAllGlobals()
  })
})
