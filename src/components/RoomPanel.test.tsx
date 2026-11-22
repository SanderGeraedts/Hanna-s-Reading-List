import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { RoomPanel, useRoom } from './RoomPanel'
import { DEFAULT_ROOM } from '#/lib/room'
import type { Room } from '#/lib/room'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const panel = (room: Room, onRoom = vi.fn()) => {
  render(<RoomPanel room={room} onRoom={onRoom} onClose={() => {}} />)
  return onRoom
}

describe('the Detailed books switch in the room panel (T-0034, D-0035)', () => {
  it('shows a Detailed books checkbox in a Books group, ticked by default', () => {
    panel(DEFAULT_ROOM)
    const group = screen.getByRole('group', { name: 'Books' })
    const box = within(group).getByRole('checkbox', { name: 'Detailed books' }) as HTMLInputElement
    expect(box.checked).toBe(true)
  })

  it('sits between Wallpaper and the decorations', () => {
    panel(DEFAULT_ROOM)
    const boxes = screen.getAllByRole('checkbox').map((b) => b.closest('label')?.textContent)
    // the first checkbox in the panel, before the decorations' ones
    expect(boxes[0]).toBe('Detailed books')
    const groups = screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))
    expect(groups).toEqual(['Wood', 'Wallpaper', 'Books'])
  })

  it('switches it off, leaving the rest of the room as it was', () => {
    const room: Room = { ...DEFAULT_ROOM, wood: 'cherry', wallpaper: 'midnight' }
    const onRoom = panel(room)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Detailed books' }))
    expect(onRoom).toHaveBeenCalledWith({ ...room, detailedBooks: false })
  })

  it('shows it unticked when off, and Reset ticks it again', () => {
    const onRoom = panel({ ...DEFAULT_ROOM, detailedBooks: false })
    expect((screen.getByRole('checkbox', { name: 'Detailed books' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onRoom).toHaveBeenCalledWith(DEFAULT_ROOM)
    expect(onRoom.mock.calls[0][0].detailedBooks).toBe(true)
  })

  it('is kept on this device: written to localStorage and read back after a remount', () => {
    const first = renderHook(() => useRoom())
    expect(first.result.current[0].detailedBooks).toBe(true)
    act(() => first.result.current[1]({ ...first.result.current[0], detailedBooks: false }))
    expect(JSON.parse(localStorage.getItem('hannas-reading-list:room') ?? '{}').detailedBooks).toBe(false)
    first.unmount()
    const again = renderHook(() => useRoom())
    expect(again.result.current[0].detailedBooks).toBe(false)
  })
})
