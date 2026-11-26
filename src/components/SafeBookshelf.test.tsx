import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { BookshelfSceneProps } from './BookshelfScene'
import { troubleLine } from '#/lib/trouble'

// stands in for the 3D scene: it fails the way three.js does when the browser
// can't start WebGL, or hands out its "context lost" callback
const scene = vi.hoisted(() => ({ fail: true, renders: 0, lost: null as null | (() => void) }))
vi.mock('./BookshelfScene', () => ({
  BookshelfScene: (props: BookshelfSceneProps) => {
    scene.renders++
    scene.lost = props.onContextLost ?? null
    if (scene.fail) throw new Error('THREE.WebGLRenderer: Error creating WebGL context.')
    return <canvas data-testid="shelf" />
  },
}))

const { SafeBookshelf } = await import('./SafeBookshelf')
const { DEFAULT_ROOM } = await import('#/lib/room')

const props = {
  books: [],
  selectedId: null,
  inspect: { current: { rotX: 0, rotY: 0 } },
  onSelect: () => {},
  onReorder: () => {},
} satisfies BookshelfSceneProps

afterEach(() => {
  cleanup()
  scene.fail = true
  scene.renders = 0
  scene.lost = null
})

describe('the bookshelf when the 3D drawing fails (#181)', () => {
  it('shows the note instead of an empty page when WebGL cannot be created', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} />)
    const note = screen.getByRole('status')
    expect(note.textContent).toContain(troubleLine('shelf-not-drawn').what)
    expect(note.textContent).toContain(troubleLine('shelf-not-drawn').safe)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByTestId('shelf')).toBeNull()
  })

  it('draws the shelf again with "Try again"', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} />)
    scene.fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByTestId('shelf')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the note when the phone drops the drawing (context lost)', () => {
    scene.fail = false
    render(<SafeBookshelf {...props} />)
    expect(screen.getByTestId('shelf')).toBeTruthy()
    act(() => scene.lost?.())
    expect(screen.getByRole('status').textContent).toContain('can’t be drawn')
    expect(screen.queryByTestId('shelf')).toBeNull()
  })

  it('says why under Details: the error, or how long until the drawing was lost', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} />)
    fireEvent.click(screen.getByText('Details'))
    expect(screen.getByRole('status').textContent).toContain('error: THREE.WebGLRenderer: Error creating WebGL context.')
    cleanup()
    scene.fail = false
    render(<SafeBookshelf {...props} />)
    act(() => scene.lost?.())
    expect(screen.getByRole('status').textContent).toMatch(/lost after \d+ s · 0 books/)
  })

  it('shows the shelf, and no note, when drawing works', () => {
    scene.fail = false
    render(<SafeBookshelf {...props} />)
    expect(screen.getByTestId('shelf')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('the note offers the simple books while they are detailed (T-0034, D-0035)', () => {
  it('shows "Show simple books" next to "Try again" when Detailed books is on', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} room={DEFAULT_ROOM} onRoom={() => {}} />)
    const buttons = screen.getAllByRole('button').map((b) => b.textContent)
    expect(buttons).toEqual(['Try again', 'Show simple books'])
  })

  it('switches Detailed books off and draws the shelf again with it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRoom = vi.fn()
    const room = { ...DEFAULT_ROOM, wood: 'cherry' as const }
    render(<SafeBookshelf {...props} room={room} onRoom={onRoom} />)
    const before = scene.renders
    scene.fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Show simple books' }))
    expect(onRoom).toHaveBeenCalledTimes(1)
    expect(onRoom).toHaveBeenCalledWith({ ...room, detailedBooks: false })
    expect(scene.renders).toBeGreaterThan(before)
    expect(screen.getByTestId('shelf')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('offers only "Try again" when Detailed books is off', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} room={{ ...DEFAULT_ROOM, detailedBooks: false }} onRoom={() => {}} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Show simple books' })).toBeNull()
  })

  it('never switches it off by itself: a lost drawing only shows the note', () => {
    scene.fail = false
    const onRoom = vi.fn()
    render(<SafeBookshelf {...props} room={DEFAULT_ROOM} onRoom={onRoom} />)
    act(() => scene.lost?.())
    expect(screen.getByRole('button', { name: 'Show simple books' })).toBeTruthy()
    expect(onRoom).not.toHaveBeenCalled()
  })

  // tester (T-0034): with no way to save the choice, the action would do nothing, so it isn't offered
  it('offers only "Try again" when there is no onRoom to switch it with', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SafeBookshelf {...props} room={DEFAULT_ROOM} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Try again'])
  })

  it('comes back with only "Try again" when the simple books fail too', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRoom = vi.fn()
    const { rerender } = render(<SafeBookshelf {...props} room={DEFAULT_ROOM} onRoom={onRoom} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show simple books' }))
    // the parent passes the room it saved; the scene still fails (scene.fail stays true)
    rerender(<SafeBookshelf {...props} room={{ ...DEFAULT_ROOM, detailedBooks: false }} onRoom={onRoom} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Try again'])
  })
})
