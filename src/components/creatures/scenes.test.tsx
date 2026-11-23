import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * How much the creature scenes render (T-0029 Done when 3 and 12, Design
 * §12): the den on demand on a phone and with reduce motion, every frame on a
 * computer, and not at all (`frameloop="never"`) when the page is hidden or
 * something is over it; the block's picture only on demand. The Canvas is
 * replaced by a div that shows the props it got (happy-dom has no WebGL).
 */

vi.mock('@react-three/fiber', () => ({
  Canvas: (p: { frameloop?: string; shadows?: boolean; dpr?: number[]; className?: string; 'aria-hidden'?: 'true' | 'false' }) => (
    <div
      data-testid={p.className}
      data-frameloop={p.frameloop}
      data-shadows={String(!!p.shadows)}
      data-dpr={JSON.stringify(p.dpr)}
      aria-hidden={p['aria-hidden']}
    />
  ),
  useFrame: () => {},
  useThree: () => ({}),
}))

const { DenScene } = await import('./DenScene')
const { CreatureStill } = await import('./CreatureStill')
const { ChooseScene } = await import('./ChooseScene')

afterEach(() => {
  cleanup()
  Object.defineProperty(document, 'hidden', { value: false, configurable: true })
})

const creature = { kind: 'creature', species: 'cat', shiny: false, stage: 'baby', mood: null } as const
const den = (p: Partial<Parameters<typeof DenScene>[0]> = {}) =>
  render(<DenScene shows={creature} cookies={10} phone={false} reduce={false} {...p} />).getByTestId('den-canvas')

describe('the den', () => {
  it('renders every frame on a computer, with shadows', () => {
    const c = den()
    expect(c.dataset.frameloop).toBe('always')
    expect(c.dataset.shadows).toBe('true')
    expect(c.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders on demand on a phone, without shadow maps, at most 1.5× pixels', () => {
    const c = den({ phone: true })
    expect(c.dataset.frameloop).toBe('demand')
    expect(c.dataset.shadows).toBe('false')
    expect(JSON.parse(c.dataset.dpr!)).toEqual([1, 1.5])
  })

  it('renders on demand with reduce motion', () => {
    expect(den({ reduce: true }).dataset.frameloop).toBe('demand')
  })

  it('stops when the book panel or a sheet is over it', () => {
    expect(den({ paused: true }).dataset.frameloop).toBe('never')
    cleanup()
    expect(den({ phone: true, paused: true }).dataset.frameloop).toBe('never')
  })

  it('stops while the page is hidden, and starts again when it is back', () => {
    const c = den({ phone: true })
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(c.dataset.frameloop).toBe('never')
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(c.dataset.frameloop).toBe('demand')
  })
})

describe('the dashboard block’s picture', () => {
  it('is rendered on demand only: it never moves', () => {
    const c = render(<CreatureStill shows={creature} phone />).getByTestId('still-canvas')
    expect(c.dataset.frameloop).toBe('demand')
    expect(c.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('the choose step', () => {
  it('draws the five in one canvas on demand, and stops while the page is hidden', () => {
    const view = render(<ChooseScene species={['cat', 'red-fox']} tiles={[]} picked={null} phone reduce={false} />)
    expect(view.getAllByTestId('choose-canvas')).toHaveLength(1)
    expect(view.getByTestId('choose-canvas').dataset.frameloop).toBe('demand')
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(view.getByTestId('choose-canvas').dataset.frameloop).toBe('never')
  })
})
