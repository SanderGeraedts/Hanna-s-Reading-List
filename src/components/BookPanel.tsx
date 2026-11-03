import { useState } from 'react'
import type { Book, ReadingStatus } from '#/lib/library'
import { STATUS_LABELS, timesRead } from '#/lib/library'
import type { SeriesInfo } from '#/lib/series'

export type Face = 'front' | 'spine' | 'back'

interface Props {
  book: Book
  onFace: (face: Face) => void
  onStatus: (status: ReadingStatus) => void
  onProgress: (progress: number) => void
  /** edits to other details: times read, series */
  onUpdate: (patch: Partial<Book>) => void
  /** series found automatically, shown as a hint when none was entered */
  detectedSeries?: SeriesInfo
  onRemove: () => void
  onClose: () => void
}

export function BookPanel({
  book,
  onFace,
  onStatus,
  onProgress,
  onUpdate,
  detectedSeries,
  onRemove,
  onClose,
}: Props) {
  const pct = Math.round((book.progress ?? 0) * 100)
  const reads = timesRead(book)
  const [seriesName, setSeriesName] = useState(book.series ?? '')
  const [seriesNo, setSeriesNo] = useState(book.seriesIndex?.toString() ?? '')
  const saveSeries = (name: string, no: string) => {
    const n = Number(no)
    onUpdate({
      series: name.trim() || undefined,
      seriesIndex: name.trim() && no.trim() && Number.isFinite(n) ? n : undefined,
    })
  }
  return (
    <aside className="panel" aria-label={`Details for ${book.title}`}>
      <div className="panel-top">
        <div>
          <h2>{book.title}</h2>
          <p className="byline">{book.authors.join(', ') || 'Unknown author'}</p>
          <p className="muted">
            {[book.year, book.pages && `${book.pages} pages`, book.isbn && `ISBN ${book.isbn}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Put back on the shelf">
          ×
        </button>
      </div>

      <div className="segmented" role="group" aria-label="Show side">
        <button onClick={() => onFace('front')}>Front</button>
        <button onClick={() => onFace('spine')}>Spine</button>
        <button onClick={() => onFace('back')}>Back</button>
      </div>
      <p className="hint">Drag to turn the book · ← → to flip · Esc to put it back</p>

      <label className="field">
        <span>Status</span>
        <select
          className="input"
          value={book.status}
          onChange={(e) => onStatus(e.target.value as ReadingStatus)}
        >
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {book.status === 'reading' && (
        <label className="field">
          <span className="progress-label">
            <span>Progress</span>
            <span>
              {pct}%
              {book.pages ? ` · page ${Math.round((pct / 100) * book.pages)} of ${book.pages}` : ''}
            </span>
          </span>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => onProgress(Number(e.target.value) / 100)}
          />
        </label>
      )}

      {(book.status === 'read' || reads > 0) && (
        <div className="field">
          <span>Times read</span>
          <div className="stepper" role="group" aria-label="Times read">
            <button
              className="btn"
              aria-label="One fewer"
              disabled={reads <= (book.status === 'read' ? 1 : 0)}
              onClick={() => onUpdate({ readCount: reads - 1 })}
            >
              −
            </button>
            <output aria-live="polite">{reads}</output>
            <button className="btn" aria-label="One more" onClick={() => onUpdate({ readCount: reads + 1 })}>
              +
            </button>
          </div>
        </div>
      )}

      <div className="field">
        <span>Series</span>
        <div className="series-row">
          <input
            className="input"
            value={seriesName}
            placeholder={detectedSeries && !book.series ? detectedSeries.name : 'Not in a series'}
            aria-label="Series name"
            onChange={(e) => setSeriesName(e.target.value)}
            onBlur={() => saveSeries(seriesName, seriesNo)}
          />
          <input
            className="input series-no"
            value={seriesNo}
            inputMode="decimal"
            placeholder={detectedSeries?.index && !book.series ? `#${detectedSeries.index}` : '#'}
            aria-label="Number in series"
            onChange={(e) => setSeriesNo(e.target.value.replace(/[^\d.]/g, ''))}
            onBlur={() => saveSeries(seriesName, seriesNo)}
          />
        </div>
      </div>

      {book.description && <p className="description">{book.description}</p>}

      <div className="panel-actions">
        <button className="btn" onClick={onClose}>
          Put back
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm(`Remove “${book.title}” from the shelf?`)) onRemove()
          }}
        >
          Remove
        </button>
      </div>
    </aside>
  )
}
