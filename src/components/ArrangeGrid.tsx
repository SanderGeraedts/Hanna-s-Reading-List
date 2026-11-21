import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { hideIn, moveIn, oneColumn, placeIn } from '#/lib/twoColumns'
import type { TwoColumns } from '#/lib/twoColumns'

/** Where a dragged block would land, and which block (or column end) shows the drop line. */
interface Drop {
  column: 0 | 1
  index: number
  marker: string
}

interface Props<T extends string> {
  layout: TwoColumns<T>
  onLayout: (next: TwoColumns<T>) => void
  arranging: boolean
  /** one column on a narrow screen */
  narrow: boolean
  label: (id: T) => string
  render: (id: T) => ReactNode
  /** an element id for each block, e.g. to scroll to it */
  anchor?: (id: T) => string
}

/**
 * Blocks in two columns that Hanna can arrange: while arranging, each block
 * has ⠿ to drag it (or move it with the arrow keys) and × to hide it, like
 * the dashboard.
 */
export function ArrangeGrid<T extends string>({ layout, onLayout, arranging, narrow, label, render, anchor }: Props<T>) {
  const grid = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, scroll: 0 })
  const [drag, setDrag] = useState<{ id: T; dx: number; dy: number; drop: Drop | null } | null>(null)
  const columns: T[][] = narrow ? [oneColumn(layout.columns)] : layout.columns
  const scroller = () => grid.current?.closest<HTMLElement>('.dashboard') ?? null

  const dropAt = (x: number, y: number, id: T): Drop | null => {
    const cols = [...(grid.current?.querySelectorAll<HTMLElement>(':scope > .dash-column') ?? [])]
    if (!cols.length) return null
    const dist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return x < r.left ? r.left - x : x > r.right ? x - r.right : 0
    }
    const visual = cols.reduce((best, el, i) => (dist(el) < dist(cols[best]) ? i : best), 0)
    const others = [...cols[visual].querySelectorAll<HTMLElement>(':scope > .dash-block')].filter((el) => el.dataset.block !== id)
    const rest = hideIn(layout, id)
    const before = others.find((el) => {
      const r = el.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    if (before) {
      const place = placeIn(rest, before.dataset.block as T)
      return place && { ...place, marker: before.dataset.block! }
    }
    const last = others.at(-1)
    if (last) {
      const place = placeIn(rest, last.dataset.block as T)
      return place && { column: place.column, index: place.index + 1, marker: `end:${visual}` }
    }
    return { column: visual as 0 | 1, index: 0, marker: `end:${visual}` }
  }

  const handleProps = (id: T) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, scroll: scroller()?.scrollTop ?? 0 }
      setDrag({ id, dx: 0, dy: 0, drop: null })
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== id) return
      const el = scroller()
      if (el) {
        if (e.clientY < 80) el.scrollTop -= 14
        else if (e.clientY > window.innerHeight - 60) el.scrollTop += 14
      }
      const scrolled = (el?.scrollTop ?? 0) - start.current.scroll
      setDrag({ id, dx: e.clientX - start.current.x, dy: e.clientY - start.current.y + scrolled, drop: dropAt(e.clientX, e.clientY, id) })
    },
    onPointerUp: () => {
      if (drag?.id === id && drag.drop) onLayout(moveIn(layout, id, drag.drop.column, drag.drop.index))
      setDrag(null)
    },
    onPointerCancel: () => setDrag(null),
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const place = placeIn(layout, id)
      if (!place) return
      const to =
        e.key === 'ArrowUp'
          ? { column: place.column, index: place.index - 1 }
          : e.key === 'ArrowDown'
            ? { column: place.column, index: place.index + 1 }
            : e.key === 'ArrowLeft' && !narrow
              ? { column: 0 as const, index: place.index }
              : e.key === 'ArrowRight' && !narrow
                ? { column: 1 as const, index: place.index }
                : null
      if (!to || to.index < 0) return
      e.preventDefault()
      onLayout(moveIn(layout, id, to.column, to.index))
    },
  })

  return (
    <div className={`dashboard-grid${arranging ? ' arranging' : ''}${drag ? ' dragging' : ''}`} ref={grid}>
      {columns.map((ids, visual) => (
        <div className="dash-column" key={visual}>
          {ids.map((id) => {
            const moving = drag?.id === id
            return (
              <div
                key={id}
                id={anchor?.(id)}
                data-block={id}
                className={`dash-block${moving ? ' moving' : ''}${drag?.drop?.marker === id ? ' drop-before' : ''}`}
                style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
              >
                {arranging && (
                  <div className="block-tools">
                    <button
                      className="btn icon small block-handle"
                      aria-label={`Move ${label(id)}: drag it, or use the arrow keys`}
                      title="Drag to move"
                      {...handleProps(id)}
                    >
                      <span aria-hidden>⠿</span>
                    </button>
                    <button className="btn icon small" aria-label={`Hide ${label(id)}`} title="Hide" onClick={() => onLayout(hideIn(layout, id))}>
                      ×
                    </button>
                  </div>
                )}
                {render(id)}
              </div>
            )
          })}
          {drag?.drop?.marker === `end:${visual}` && <div className="drop-end" aria-hidden />}
        </div>
      ))}
    </div>
  )
}
