import { Component, useCallback, useRef, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { BookshelfScene } from './BookshelfScene'
import type { BookshelfSceneProps } from './BookshelfScene'
import { describeFailure, deviceInfo } from '#/lib/shelfDiagnosis'
import type { ShelfFailure } from '#/lib/shelfDiagnosis'

/**
 * The 3D bookshelf, with a way out when the browser can't draw it (#181):
 * WebGL can't be started, a picture for the shelf can't be painted, or the
 * phone drops the drawing when it runs out of memory. Instead of an empty
 * room (or an empty page) she gets a note and "Try again", which draws the
 * shelf from scratch.
 */
export function SafeBookshelf(props: BookshelfSceneProps) {
  // why it failed, as one line for the note's Details; null while it works
  const [failed, setFailed] = useState<string | null>(null)
  // a new key draws the shelf from scratch: a new canvas and WebGL context
  const [attempt, setAttempt] = useState(0)
  const started = useRef(Date.now())
  const count = props.books.length
  const fail = useCallback(
    (f: ShelfFailure) => setFailed((prev) => prev ?? describeFailure(f, count, deviceInfo())),
    [count],
  )
  const lost = useCallback(() => fail({ kind: 'lost', afterSeconds: (Date.now() - started.current) / 1000 }), [fail])
  const error = useCallback((e: unknown) => fail({ kind: 'error', message: e instanceof Error ? e.message : String(e) }), [fail])
  if (failed !== null) {
    return (
      <ShelfError
        details={failed}
        onRetry={() => {
          setFailed(null)
          started.current = Date.now()
          setAttempt((a) => a + 1)
        }}
      />
    )
  }
  return (
    <SceneBoundary key={attempt} onError={error}>
      <BookshelfScene {...props} onContextLost={lost} />
    </SceneBoundary>
  )
}

/** The note in the middle of the page, styled like the empty-shelf note. */
export function ShelfError({ onRetry, details }: { onRetry: () => void; details?: string }) {
  return (
    <div className="empty shelf-error" role="status">
      <p>The bookshelf can't be drawn on this phone right now.</p>
      <p className="shelf-error-sub">Your books are safe. The Dashboard, Challenges and Calendar still work.</p>
      <button type="button" className="btn primary" onClick={onRetry}>
        Try again
      </button>
      {details && (
        <details className="shelf-error-details">
          <summary>Details</summary>
          <code>{details}</code>
        </details>
      )}
    </div>
  )
}

class SceneBoundary extends Component<{ onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('The bookshelf could not be drawn', error, info.componentStack)
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
