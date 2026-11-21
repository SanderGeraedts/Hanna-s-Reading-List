import { Component, useCallback, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BookshelfScene } from './BookshelfScene'
import type { BookshelfSceneProps } from './BookshelfScene'

/**
 * The 3D bookshelf, with a way out when the browser can't draw it (#181):
 * WebGL can't be started, a picture for the shelf can't be painted, or the
 * phone drops the drawing when it runs out of memory. Instead of an empty
 * room (or an empty page) she gets a note and "Try again", which draws the
 * shelf from scratch.
 */
export function SafeBookshelf(props: BookshelfSceneProps) {
  const [failed, setFailed] = useState(false)
  // a new key draws the shelf from scratch: a new canvas and WebGL context
  const [attempt, setAttempt] = useState(0)
  const fail = useCallback(() => setFailed(true), [])
  if (failed) {
    return (
      <ShelfError
        onRetry={() => {
          setFailed(false)
          setAttempt((a) => a + 1)
        }}
      />
    )
  }
  return (
    <SceneBoundary key={attempt} onError={fail}>
      <BookshelfScene {...props} onContextLost={fail} />
    </SceneBoundary>
  )
}

/** The note in the middle of the page, styled like the empty-shelf note. */
export function ShelfError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty shelf-error" role="status">
      <p>The bookshelf can't be drawn on this phone right now.</p>
      <p className="shelf-error-sub">Your books are safe. The Dashboard, Challenges and Calendar still work.</p>
      <button type="button" className="btn primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('The bookshelf could not be drawn', error, info.componentStack)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
