import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { BookshelfScene } from '#/components/BookshelfScene'
import { AddBookDialog } from '#/components/AddBookDialog'
import { BookPanel } from '#/components/BookPanel'
import { CoverPicker } from '#/components/CoverPicker'
import type { Face } from '#/components/BookPanel'
import { nearestTurn } from '#/components/BookMesh'
import type { InspectTarget } from '#/components/BookMesh'
import { SORT_LABELS, STATUS_LABELS, useLibrary } from '#/lib/library'
import type { SortKey } from '#/lib/library'
import { detectSeries } from '#/lib/series'
import { useStorytelSync } from '#/lib/useStorytelSync'
import type { Tab } from '#/components/AddBookDialog'

export const Route = createFileRoute('/')({ component: Home })

const FACE_ANGLE: Record<Face, number> = { front: 0, spine: Math.PI / 2, back: Math.PI }

function Home() {
  const { books, loaded, arrangement, addBook, removeBook, updateBook, reorder, sortBy } = useLibrary()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState<Tab | null>(null)
  const [pickingCover, setPickingCover] = useState(false)
  const inspect = useRef<InspectTarget>({ rotY: 0, rotX: 0 })
  // share of the screen the details sheet covers on phones; the scene keeps the book above it
  const sheet = useRef(0.45)
  const onSheet = useCallback((share: number) => {
    sheet.current = share
  }, [])
  const syncCallbacks = useMemo(() => ({ addBook, updateBook }), [addBook, updateBook])
  const storytel = useStorytelSync(books, syncCallbacks)
  const { state: syncState, dismiss: dismissSync } = storytel

  // the result message fades by itself
  useEffect(() => {
    if (syncState.kind !== 'done') return
    const t = setTimeout(dismissSync, 5000)
    return () => clearTimeout(t)
  }, [syncState, dismissSync])

  const selected = books.find((b) => b.id === selectedId) ?? null
  const seriesMap = useMemo(() => detectSeries(books), [books])
  const selectedSeries = selected ? seriesMap.get(selected.id) : undefined

  const select = useCallback((id: string | null) => {
    if (id) inspect.current = { rotY: 0, rotX: 0 }
    setSelectedId(id)
  }, [])

  const showFace = useCallback((face: Face) => {
    const t = inspect.current
    t.rotY = nearestTurn(FACE_ANGLE[face], t.rotY)
    t.rotX = 0
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      // a dialog on top (e.g. the cover picker) handles its own keys
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') select(null)
      // snap to the next quarter turn
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const t = inspect.current
        const q = Math.PI / 2
        t.rotY = (Math.round(t.rotY / q) + (e.key === 'ArrowRight' ? 1 : -1)) * q
        t.rotX = 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, select])

  const counts = books.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Hanna's Reading List</h1>
          <p className="muted">
            {books.length === 0
              ? 'An empty shelf, waiting for stories'
              : `${books.length} book${books.length === 1 ? '' : 's'} · ` +
                (['reading', 'want', 'read'] as const)
                  .filter((s) => counts[s])
                  .map((s) => `${counts[s]} ${STATUS_LABELS[s].toLowerCase()}`)
                  .join(' · ')}
          </p>
        </div>
        <div className="toolbar">
          <label className="sort">
            <span className="muted">Arrange by</span>
            <select
              className="input"
              value=""
              disabled={books.length < 2}
              onChange={(e) => {
                if (e.target.value) sortBy(e.target.value as SortKey)
              }}
            >
              <option value="">Sort…</option>
              {Object.entries(SORT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className={`btn icon refresh${syncState.kind === 'busy' ? ' spinning' : ''}`}
            disabled={syncState.kind === 'busy'}
            // not signed in yet: open the Storytel sign-in instead
            onClick={storytel.login.saved ? storytel.refresh : () => setAdding('storytel')}
            aria-label="Refresh from Storytel"
            title="Refresh from Storytel"
          >
            <span aria-hidden>↻</span>
          </button>
          <button className="btn primary" onClick={() => setAdding('search')}>
            + Add<span className="hide-mobile"> book</span>
          </button>
        </div>
      </header>

      <main className="stage">
        <ClientOnly fallback={<div className="stage-loading">Building the shelf…</div>}>
          <BookshelfScene
            books={books}
            selectedId={selectedId}
            inspect={inspect}
            onSelect={select}
            onReorder={reorder}
            arrangement={arrangement}
            sheet={sheet}
          />
        </ClientOnly>

        {loaded && books.length === 0 && (
          <div className="empty">
            <p>Add your first book to start filling the shelf.</p>
            <button className="btn primary" onClick={() => setAdding('search')}>
              + Add book
            </button>
          </div>
        )}
        {books.length > 1 && !selected && (
          <p className="stage-hint">
            <span className="hint-mouse">Click a book to pull it off the shelf · drag to rearrange</span>
            <span className="hint-touch">Tap a book to take it out · swipe to scroll · hold to move</span>
          </p>
        )}
      </main>

      {selected && (
        <BookPanel
          key={selected.id}
          book={selected}
          onFace={showFace}
          // finishing a book counts as its first read
          onStatus={(status) =>
            updateBook(selected.id, {
              status,
              ...(status === 'read' && !selected.readCount && { readCount: 1 }),
            })
          }
          onProgress={(progress) => updateBook(selected.id, { progress })}
          onUpdate={(patch) => {
            updateBook(selected.id, patch)
            // arranged by series: move the book to its new series straight away
            if (arrangement === 'series' && ('series' in patch || 'seriesIndex' in patch)) sortBy('series')
          }}
          detectedSeries={selectedSeries}
          onChangeCover={() => setPickingCover(true)}
          onRemove={() => {
            select(null)
            removeBook(selected.id)
          }}
          onClose={() => select(null)}
          onSheet={onSheet}
        />
      )}

      {selected && pickingCover && (
        <CoverPicker
          book={selected}
          onChange={(patch) => updateBook(selected.id, patch)}
          onClose={() => setPickingCover(false)}
        />
      )}

      {adding && (
        <AddBookDialog
          existing={books}
          onAdd={addBook}
          onUpdate={updateBook}
          onClose={() => setAdding(null)}
          storytelLogin={storytel.login}
          onStorytelLogin={storytel.setLogin}
          initialTab={adding}
        />
      )}

      {syncState.kind !== 'idle' && (
        <div className={`toast ${syncState.kind}`} role="status" aria-live="polite">
          {syncState.kind === 'busy' ? (
            <span>
              {syncState.total
                ? `Adding new books ${syncState.done} / ${syncState.total}…`
                : 'Checking Storytel…'}
            </span>
          ) : (
            <>
              <span>{syncState.message}</span>
              {syncState.kind === 'error' && !storytel.login.saved && (
                <button
                  className="btn"
                  onClick={() => {
                    dismissSync()
                    setAdding('storytel')
                  }}
                >
                  Sign in
                </button>
              )}
              <button className="icon-btn" onClick={dismissSync} aria-label="Dismiss">
                ×
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
