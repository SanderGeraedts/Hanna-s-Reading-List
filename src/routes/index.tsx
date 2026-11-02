import { useCallback, useEffect, useRef, useState } from 'react'
import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { BookshelfScene } from '#/components/BookshelfScene'
import { AddBookDialog } from '#/components/AddBookDialog'
import { BookPanel } from '#/components/BookPanel'
import type { Face } from '#/components/BookPanel'
import { nearestTurn } from '#/components/BookMesh'
import type { InspectTarget } from '#/components/BookMesh'
import { SORT_LABELS, STATUS_LABELS, useLibrary } from '#/lib/library'
import type { SortKey } from '#/lib/library'

export const Route = createFileRoute('/')({ component: Home })

const FACE_ANGLE: Record<Face, number> = { front: 0, spine: Math.PI / 2, back: Math.PI }

function Home() {
  const { books, loaded, addBook, removeBook, updateBook, reorder, sortBy } = useLibrary()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const inspect = useRef<InspectTarget>({ rotY: 0, rotX: 0 })

  const selected = books.find((b) => b.id === selectedId) ?? null

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
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
          <button className="btn primary" onClick={() => setAdding(true)}>
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
          />
        </ClientOnly>

        {loaded && books.length === 0 && (
          <div className="empty">
            <p>Add your first book to start filling the shelf.</p>
            <button className="btn primary" onClick={() => setAdding(true)}>
              + Add book
            </button>
          </div>
        )}
        {books.length > 1 && !selected && (
          <p className="stage-hint">Click a book to pull it off the shelf · drag to rearrange</p>
        )}
      </main>

      {selected && (
        <BookPanel
          key={selected.id}
          book={selected}
          onFace={showFace}
          onStatus={(status) => updateBook(selected.id, { status })}
          onRemove={() => {
            select(null)
            removeBook(selected.id)
          }}
          onClose={() => select(null)}
        />
      )}

      {adding && (
        <AddBookDialog
          existing={books}
          onAdd={addBook}
          onUpdate={updateBook}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  )
}
