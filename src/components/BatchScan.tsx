import { useEffect, useRef, useState } from 'react'
import type { Book, BookFormat, NewBook } from '#/lib/library'
import { FORMAT_LABELS } from '#/lib/library'
import { buildBook } from '#/lib/buildBook'
import { coverUrlForId } from '#/lib/cover'
import { parsePrice } from '#/lib/price'
import type { PriceProblem } from '#/lib/price'
import { lookupIsbn } from '#/server/openLibrary'
import type { IsbnLookup } from '#/server/openLibrary'
import {
  DEFAULT_PILE_FORMATS,
  addAllLabel,
  addScan,
  addableRows,
  addedText,
  anyLooking,
  firstPriceProblem,
  formatList,
  formatsOfRow,
  listHeading,
  patchRow,
  removeRow,
  retryRow,
  rowAsksPrice,
  settleScan,
} from '#/lib/batchScan'
import type { ScanRow } from '#/lib/batchScan'
import { BarcodeScanner } from './BarcodeScanner'
import { PriceInput } from './PriceField'

interface Props {
  /** the whole library: shelf books and wishes, so neither is added twice (D-0053) */
  existing: Book[]
  onAdd: (book: NewBook) => void
  /** an ISBN Open Library doesn't know: the Manual tab, with the number filled in */
  onManual: (isbn: string) => void
  /** closes the whole add dialog ("Done" on the summary) */
  onClose: () => void
  /** something else covers the tab: the camera waits */
  paused?: boolean
  /** injected in tests, so no network and no camera are needed */
  lookup?: (isbn: string) => Promise<IsbnLookup | null>
}

const defaultLookup = (isbn: string) => lookupIsbn({ data: { isbn } })

/**
 * Scanning a pile of books in one go (T-0071). The camera never stops: each
 * barcode drops into the list below it, and at the end one **How I have it**
 * covers the pile, every book has its own price field (D-0024) and **Add all**
 * puts them on the shelf. The list's rules live in `lib/batchScan.ts`.
 */
export function BatchScan({ existing, onAdd, onManual, onClose, paused = false, lookup = defaultLookup }: Props) {
  const [rows, setRows] = useState<ScanRow[]>([])
  const [pile, setPile] = useState<BookFormat[]>(DEFAULT_PILE_FORMATS)
  const [event, setEvent] = useState('')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [problem, setProblem] = useState<{ isbn: string; problem: PriceProblem } | null>(null)
  /** the row whose own "How I have it" chips are open; only one at a time keeps the list short */
  const [open, setOpen] = useState<string | null>(null)
  const priceInputs = useRef(new Map<string, HTMLInputElement | null>())
  const summary = useRef<HTMLParagraphElement>(null)
  /** the rows as they are right now, so a scan can be worked out without updating in a render */
  const latest = useRef(rows)
  latest.current = rows

  const apply = (next: { rows: ScanRow[]; event: string }) => {
    latest.current = next.rows
    setRows(next.rows)
    if (next.event) setEvent(next.event)
  }

  const look = async (isbn: string) => {
    try {
      const result = await lookup(isbn)
      apply(settleScan(latest.current, isbn, { ok: true, result }))
    } catch {
      apply(settleScan(latest.current, isbn, { ok: false }))
    }
  }

  const scanned = (isbn: string) => {
    const next = addScan(latest.current, isbn, existing)
    const isNew = next.rows !== latest.current && next.rows[0]?.kind === 'looking'
    apply(next)
    if (isNew) void look(isbn)
  }

  const setFormats = (row: ScanRow, f: BookFormat) => {
    const now = formatsOfRow(row, pile)
    const next = now.includes(f) ? now.filter((x) => x !== f) : [...now, f]
    // unticking the last bought format hides the price field; what was in it isn't kept (D-0024)
    const keepsPrice = next.some((x) => x === 'paperback' || x === 'hardcover' || x === 'ebook')
    setRows((rs) => patchRow(rs, row.isbn, { formats: next, ...(keepsPrice ? {} : { price: '' }) }))
    setProblem(null)
  }

  const addAll = async () => {
    const bad = firstPriceProblem(rows, pile)
    if (bad) {
      setProblem(bad)
      priceInputs.current.get(bad.isbn)?.focus()
      return
    }
    setProblem(null)
    setAdding(true)
    try {
      const todo = addableRows(rows)
      for (const row of todo) {
        const result = row.result!
        const book = await buildBook(result, result)
        const formats = formatsOfRow(row, pile)
        const price = rowAsksPrice(row, pile) ? parsePrice(row.price) : null
        onAdd({
          ...book,
          ...(formats.length > 0 && { formats }),
          ...(price?.ok && price.price !== undefined && { price: price.price }),
        })
      }
      latest.current = []
      setRows([])
      setAdded(todo.length)
    } finally {
      setAdding(false)
    }
  }

  // after Add all, focus goes to the line that says what happened
  useEffect(() => {
    if (added !== null) summary.current?.focus()
  }, [added])

  if (added !== null) {
    return (
      <div className="tab-panel scan-tab">
        <p className="success" role="status" tabIndex={-1} ref={summary}>
          {addedText(added)}
        </p>
        <div className="follow-up-actions">
          <button type="button" className="btn" onClick={() => setAdded(null)}>
            Scan more
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    )
  }

  const addable = addableRows(rows).length
  return (
    <div className="tab-panel scan-tab batch-scan">
      <div className="batch-camera">
        <BarcodeScanner onIsbn={scanned} paused={paused || adding} />
      </div>
      <p className="visually-hidden" aria-live="polite">
        {event}
      </p>

      <div className="field" role="group" aria-labelledby="batch-pile-formats">
        <span id="batch-pile-formats">How I have it</span>
        <div className="chips format-chips">
          {(Object.entries(FORMAT_LABELS) as Array<[BookFormat, string]>).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="format-chip"
              aria-pressed={pile.includes(k)}
              onClick={() => setPile(pile.includes(k) ? pile.filter((x) => x !== k) : [...pile, k])}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <h3 className="batch-heading">{listHeading(rows)}</h3>
      <ul className="batch-list">
        {rows.map((row) => {
          const found = row.result
          const name = found?.title ?? row.have?.title ?? row.isbn
          const authors = found?.authors ?? row.have?.authors ?? []
          const cover = row.have?.coverUrl ?? (found?.coverId ? coverUrlForId(found.coverId, 'M') : undefined)
          const formats = formatsOfRow(row, pile)
          const showsPrice = rowAsksPrice(row, pile)
          return (
            <li key={row.isbn} className={row.kind === 'found' ? 'batch-row' : 'batch-row muted'}>
              <div className="batch-cover">
                {cover ? <img src={cover} alt="" loading="lazy" /> : <span aria-hidden>?</span>}
              </div>
              <div className="batch-text">
                <strong>{name}</strong>
                <span className="muted small-text">
                  {row.kind === 'looking' ? 'Looking it up…' : authors.join(', ')}
                </span>
                {row.kind === 'on-shelf' && <span className="chip">On shelf</span>}
                {row.kind === 'on-wishlist' && <span className="chip">On your wishlist</span>}
                {row.kind === 'unknown' && (
                  <span className="batch-actions">
                    <span className="chip">Not found</span>
                    <button type="button" className="btn small" onClick={() => onManual(row.isbn)}>
                      Add it by hand
                    </button>
                  </span>
                )}
                {row.kind === 'failed' && (
                  <span className="batch-actions">
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => {
                        setRows((rs) => retryRow(rs, row.isbn))
                        latest.current = retryRow(latest.current, row.isbn)
                        void look(row.isbn)
                      }}
                    >
                      Try again
                    </button>
                  </span>
                )}
                {row.kind === 'found' && (
                  <>
                    <button
                      type="button"
                      className="btn small batch-formats"
                      aria-expanded={open === row.isbn}
                      aria-label={`How I have ${name}: ${formatList(formats)}`}
                      onClick={() => setOpen(open === row.isbn ? null : row.isbn)}
                    >
                      {formatList(formats)} {open === row.isbn ? '▴' : '▾'}
                    </button>
                    {open === row.isbn && (
                      <div className="chips format-chips">
                        {(Object.entries(FORMAT_LABELS) as Array<[BookFormat, string]>).map(([k, label]) => (
                          <button
                            key={k}
                            type="button"
                            className="format-chip"
                            aria-label={`${label} — ${name}`}
                            aria-pressed={formats.includes(k)}
                            onClick={() => setFormats(row, k)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {showsPrice && (
                  <PriceInput
                    inputRef={(el) => {
                      priceInputs.current.set(row.isbn, el)
                    }}
                    label={
                      <>
                        Price<span className="visually-hidden"> of {name}, in euros</span>
                      </>
                    }
                    problem={problem?.isbn === row.isbn ? problem.problem : null}
                    value={row.price}
                    enterKeyHint="done"
                    onChange={(e) => {
                      const price = e.target.value
                      setRows((rs) => patchRow(rs, row.isbn, { price }))
                      setProblem(null)
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                className="icon-btn batch-remove"
                aria-label={`Remove ${name} from the list`}
                onClick={() => {
                  setRows((rs) => removeRow(rs, row.isbn))
                  latest.current = removeRow(latest.current, row.isbn)
                  setProblem(null)
                }}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className="btn primary batch-add-all"
        disabled={adding || addable === 0 || anyLooking(rows)}
        onClick={addAll}
      >
        {adding ? 'Adding…' : addAllLabel(rows)}
      </button>
    </div>
  )
}
