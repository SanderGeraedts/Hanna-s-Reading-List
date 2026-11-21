import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { BookshelfSceneProps } from './BookshelfScene'

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
    expect(note.textContent).toContain("The bookshelf can't be drawn on this phone right now.")
    expect(note.textContent).toContain('Your books are safe. The Dashboard, Challenges and Calendar still work.')
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
    expect(screen.getByRole('status').textContent).toContain("can't be drawn")
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
