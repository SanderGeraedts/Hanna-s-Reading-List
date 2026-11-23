import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { RoomPanel, useRoom } from './RoomPanel'
import { DEFAULT_ROOM, ROOM_EXTRAS, cleanRoom, shownDecor } from '#/lib/room'
import type { Room, RoomExtra } from '#/lib/room'

/** The four cosy room extras in the 🎨 panel (T-0053, D-0045). */

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const panel = (room: Room, onRoom = vi.fn()) => {
  render(<RoomPanel room={room} onRoom={onRoom} onClose={() => {}} />)
  return onRoom
}

const KEYS: RoomExtra[] = ['readingCorner', 'dayNight', 'plant', 'seasonal']
const LABELS = ['Reading corner', 'Day & night', 'Growing plant', 'Seasonal decorations']

describe('the saved room (D-0045 §1)', () => {
  it('has all four on by default', () => {
    for (const k of KEYS) expect(DEFAULT_ROOM[k]).toBe(true)
  })

  it('counts anything but a saved false as on', () => {
    for (const k of KEYS) {
      expect(cleanRoom({})[k]).toBe(true)
      for (const v of [undefined, null, 'no', 1, 0, 'false']) expect(cleanRoom({ [k]: v })[k]).toBe(true)
      expect(cleanRoom({ [k]: false })[k]).toBe(false)
    }
  })

  it('loads a room saved before the extras with all four on and its own choices kept', () => {
    const old = { wood: 'cherry', wallpaper: 'midnight', decor: [{ kind: 'mug', on: false }], detailedBooks: false }
    const r = cleanRoom(JSON.parse(JSON.stringify(old)))
    for (const k of KEYS) expect(r[k]).toBe(true)
    expect(r.wood).toBe('cherry')
    expect(r.wallpaper).toBe('midnight')
    expect(r.detailedBooks).toBe(false)
    expect(r.decor.find((d) => d.kind === 'mug')?.on).toBe(false)
  })

  it('keeps the extras out of the decorations, so none of them takes a shelf', () => {
    expect(DEFAULT_ROOM.decor.some((d) => (KEYS as string[]).includes(d.kind))).toBe(false)
    expect(shownDecor(DEFAULT_ROOM).some((k) => (KEYS as string[]).includes(k))).toBe(false)
  })
})

describe('the Your room group in the panel', () => {
  it('shows the four toggles in her words, all ticked on a fresh device', () => {
    panel(DEFAULT_ROOM)
    const group = screen.getByRole('group', { name: 'Your room' })
    const boxes = within(group).getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.map((b) => b.closest('label')?.textContent)).toEqual(LABELS)
    expect(boxes.every((b) => b.checked)).toBe(true)
    expect(ROOM_EXTRAS.map((e) => e.label)).toEqual(LABELS)
  })

  it('sits between Books and the decorations', () => {
    panel(DEFAULT_ROOM)
    const groups = screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))
    expect(groups).toEqual(['Wood', 'Wallpaper', 'Books', 'Your room'])
  })

  it('flips just the one she tapped and leaves the rest of the room alone', () => {
    for (let i = 0; i < KEYS.length; i++) {
      const room: Room = { ...DEFAULT_ROOM, wood: 'cherry', wallpaper: 'midnight' }
      const onRoom = panel(room)
      fireEvent.click(screen.getByRole('checkbox', { name: LABELS[i] }))
      expect(onRoom).toHaveBeenCalledWith({ ...room, [KEYS[i]]: false })
      cleanup()
    }
  })

  it('shows one unticked when it is off, and Reset ticks them all again', () => {
    const onRoom = panel({ ...DEFAULT_ROOM, plant: false, dayNight: false })
    expect((screen.getByRole('checkbox', { name: 'Growing plant' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('checkbox', { name: 'Day & night' }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('checkbox', { name: 'Reading corner' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onRoom).toHaveBeenCalledWith(DEFAULT_ROOM)
  })

  it('keeps her choice on this device, and reads it back after a remount', () => {
    const first = renderHook(() => useRoom())
    act(() => first.result.current[1]({ ...first.result.current[0], seasonal: false, plant: false }))
    expect(JSON.parse(localStorage.getItem('hannas-reading-list:room')!)).toMatchObject({ seasonal: false, plant: false })
    first.unmount()
    const again = renderHook(() => useRoom())
    expect(again.result.current[0].seasonal).toBe(false)
    expect(again.result.current[0].plant).toBe(false)
    expect(again.result.current[0].readingCorner).toBe(true)
  })
})
