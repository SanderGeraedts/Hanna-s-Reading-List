import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { BookPanel } from './BookPanel'

/**
 * The phone's details sheet remembers the height she last saw, under the cap that keeps room for
 * the open book (T-0037 F1). Tester, T-0037: the developer found that turning the phone saved an
 * in-between cap as her preference; these check it through the real panel.
 */

const KEY = 'hannas-reading-list:sheet'
const book = (id: string): Book => ({ id, title: `Title ${id}`, authors: ['Someone'], color: '#2e5a8a', status: 'reading', addedAt: 1 }) as unknown as Book

function setScreen(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true })
}

function panel(b: Book, headerPx: number, onSheet: (share: number) => void) {
  return (
    <BookPanel
      book={b}
      onFace={() => {}}
      onStatus={() => {}}
      onProgress={() => {}}
      onUpdate={() => {}}
      genreOptions={[]}
      onChangeCover={() => {}}
      shelf={[b]}
      onMerge={() => {}}
      onRemove={() => {}}
      onClose={() => {}}
      onSheet={onSheet}
      headerPx={headerPx}
    />
  )
}

const saved = () => localStorage.getItem(KEY)
const last = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)?.[0] as number

beforeEach(() => {
  localStorage.clear()
  // every screen in these tests is a phone: the panel is the sheet
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  setScreen(390, 844)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('T-0037 F1: the sheet remembers what she last saw, under the cap (tester)', () => {
  it('a saved 0.88 opens at the cap (1 − 162/844 − 0.25) and the cap is saved, once', () => {
    localStorage.setItem(KEY, '0.880')
    const onSheet = vi.fn()
    render(panel(book('a'), 162, onSheet))
    const cap = 1 - 162 / 844 - 0.25
    expect(last(onSheet)).toBeCloseTo(Math.round(cap * 844) / 844, 3)
    expect(Number(saved())).toBeCloseTo(cap, 2)
  })

  it('a saved height under the cap opens as saved and is not rewritten', () => {
    localStorage.setItem(KEY, '0.450')
    const onSheet = vi.fn()
    render(panel(book('a'), 162, onSheet))
    expect(last(onSheet)).toBeCloseTo(0.45, 2)
    expect(saved()).toBe('0.450')
  })

  it('turning the phone applies the cap of each size but keeps her preference; back upright it is as before', () => {
    localStorage.setItem(KEY, '0.880')
    const onSheet = vi.fn()
    const { rerender } = render(panel(book('a'), 162, onSheet))
    const upright = last(onSheet)
    const kept = saved()
    // a small phone held sideways keeps the sheet (narrower than 720 px): header 43 % → cap 0.32
    setScreen(667, 375)
    rerender(panel(book('a'), 161, onSheet))
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(last(onSheet)).toBeLessThanOrEqual(1 - 161 / 375 - 0.25 + 0.002)
    expect(saved()).toBe(kept)
    // and back, several times, with a resize in between sizes
    for (let i = 0; i < 3; i++) {
      setScreen(390, 600)
      act(() => void window.dispatchEvent(new Event('resize')))
      setScreen(390, 844)
      rerender(panel(book('a'), 162, onSheet))
      act(() => void window.dispatchEvent(new Event('resize')))
    }
    expect(last(onSheet)).toBeCloseTo(upright, 3)
    expect(saved()).toBe(kept)
  })

  it('a taller header (a wrapped toolbar) lowers the cap without changing her preference', () => {
    localStorage.setItem(KEY, '0.558')
    const onSheet = vi.fn()
    const { rerender } = render(panel(book('a'), 162, onSheet))
    rerender(panel(book('a'), 220, onSheet))
    expect(last(onSheet)).toBeCloseTo(Math.round((1 - 220 / 844 - 0.25) * 844) / 844, 3)
    expect(saved()).toBe('0.558')
    rerender(panel(book('a'), 162, onSheet))
    expect(last(onSheet)).toBeCloseTo(Math.round(0.558 * 844) / 844, 3)
  })

  it('the next book opens at the height she dragged to; a drag above the cap is saved as the cap', () => {
    const onSheet = vi.fn()
    const { unmount, container } = render(panel(book('a'), 162, onSheet))
    const grab = container.querySelector('.sheet-grab') as HTMLElement
    const start = Math.round(0.45 * 844)
    // drag far above the top of the screen
    fireEvent.pointerDown(grab, { clientY: 844 - start, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: 300, pointerId: 1 })
    fireEvent.pointerMove(grab, { clientY: -200, pointerId: 1 })
    fireEvent.pointerUp(grab, { clientY: -200, pointerId: 1 })
    const cap = Math.round((1 - 162 / 844 - 0.25) * 844) / 844
    expect(Number(saved())).toBeCloseTo(cap, 3)
    unmount()
    const next = vi.fn()
    render(panel(book('b'), 162, next))
    expect(last(next)).toBeCloseTo(cap, 3)
  })
})
