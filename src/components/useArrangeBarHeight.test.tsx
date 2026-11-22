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
})
