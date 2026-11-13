import { useEffect, useRef, useState } from 'react'
import { formatPublished, normalizeIsbn, parsePublished, publishedYear } from '#/lib/bookFacts'
import { formatDuration, hasAudio, lengthPatch, linkOnFormatChange, listenOnly, parseDuration } from '#/lib/listening'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Book, BookFormat, ReadingStatus } from '#/lib/library'
import { FORMAT_LABELS, STATUS_LABELS, formatsOf, localDay, timesRead, withFormats } from '#/lib/library'
import { storytelLink } from '#/lib/storytelLink'
import {
  pageText,
  percentText,
  progressFromPage,
  progressFromPercent,
  progressFromTime,
  timeText,
} from '#/lib/progress'
import { LANGUAGE_CHOICES, languageName } from '#/lib/languages'
import { tidyTitle } from '#/lib/titles'
import type { SeriesInfo } from '#/lib/series'
import { StarRating } from './StarRating'
import { NO_SPICE, ratingText, spiceText } from '#/lib/ratings'
import { backText } from './textures'
import { MergeSection } from './MergeSection'
import { EdgesField } from './EdgesField'
import { findBackText } from '#/lib/findBackText'

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
  /** genres to suggest: the standard ones and any used on the shelf */
  genreOptions: string[]
  onChangeCover: () => void
  /** every book on the shelf, to find copies of this one */
  shelf: Book[]
  /** merge another copy into this book */
  onMerge: (otherId: string) => void
  onRemove: () => void
  onClose: () => void
  /** on phones: called with the share of the screen height the sheet covers */
  onSheet?: (share: number) => void
}

const SHEET_QUERY = '(max-width: 720px)'
const SHEET_KEY = 'hannas-reading-list:sheet'
const SHEET_DEFAULT = 0.45
const SHEET_MIN_PX = 96 // enough for the handle and the title
const SHEET_MAX = 0.88

function savedSheetShare() {
  try {
    const v = Number(localStorage.getItem(SHEET_KEY))
    return v > 0 && v < 1 ? v : SHEET_DEFAULT
  } catch {
    return SHEET_DEFAULT
  }
}

/**
 * On phones the panel is a bottom sheet whose height follows a drag on its
 * handle or title. The height is remembered for the next book.
 */
function useSheet(onSheet?: (share: number) => void) {
  const [isSheet, setIsSheet] = useState(false)
  const [height, setHeight] = useState<number | null>(null)
  const drag = useRef<{ y: number; h: number; id: number; moved: boolean } | null>(null)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(SHEET_QUERY)
    const update = () => setIsSheet(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isSheet) {
      setHeight(null)
      onSheet?.(0)
      return
    }
    const fit = () => {
      const h = Math.round(savedSheetShare() * window.innerHeight)
      setHeight(h)
      onSheet?.(h / window.innerHeight)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [isSheet, onSheet])

  const clampHeight = (h: number) =>
    Math.round(Math.min(window.innerHeight * SHEET_MAX, Math.max(SHEET_MIN_PX, h)))

  const handlers = isSheet
    ? {
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
          const h = panel.current?.getBoundingClientRect().height ?? height ?? 0
          drag.current = { y: e.clientY, h, id: e.pointerId, moved: false }
        },
        onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          const dy = e.clientY - d.y
          if (!d.moved) {
            if (Math.abs(dy) < 6) return
            // only now take the pointer, so taps on the × still work
            d.moved = true
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              /* the pointer is already gone */
            }
          }
          const h = clampHeight(d.h - dy)
          setHeight(h)
          onSheet?.(h / window.innerHeight)
        },
        onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
          const d = drag.current
          drag.current = null
          if (!d?.moved) return
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
          const share = clampHeight(d.h - (e.clientY - d.y)) / window.innerHeight
          try {
            localStorage.setItem(SHEET_KEY, share.toFixed(3))
          } catch {
            /* ignore */
          }
        },
        onPointerCancel: () => {
          drag.current = null
        },
      }
    : {}

  return { isSheet, height, handlers, panel }
}

export function BookPanel({
  book,
  onFace,
  onStatus,
  onProgress,
  onUpdate,
  detectedSeries,
  genreOptions,
  onChangeCover,
  shelf,
  onMerge,
  onRemove,
  onClose,
  onSheet,
}: Props) {
  const sheet = useSheet(onSheet)
  const progress = book.progress ?? 0
  const pct = Math.round(progress * 100)
  const reads = timesRead(book)
  const [seriesName, setSeriesName] = useState(book.series ?? '')
  const [blurb, setBlurb] = useState(backText(book))
  const [seriesNo, setSeriesNo] = useState(book.seriesIndex?.toString() ?? '')
  const [pagesDraft, setPagesDraft] = useState(book.pages?.toString() ?? '')
  /** the page count as typed: a whole number of pages, or empty to clear it */
  const savePages = () => {
    const n = Number(pagesDraft)
    if (!pagesDraft.trim()) {
      if (book.pages !== undefined) setLength({ pages: undefined })
    } else if (Number.isInteger(n) && n > 0 && n <= 20000) {
      if (n !== book.pages) setLength({ pages: n })
    } else {
      setPagesDraft(book.pages?.toString() ?? '')
    }
  }
  const [minutesDraft, setMinutesDraft] = useState(book.minutes ? formatDuration(book.minutes) : '')
  const [minutesProblem, setMinutesProblem] = useState(false)
  /** the listening time as typed (#48), or empty to clear it */
  const saveMinutes = () => {
    if (!minutesDraft.trim()) {
      setMinutesProblem(false)
      if (book.minutes !== undefined) setLength({ minutes: undefined })
      return
    }
    const minutes = parseDuration(minutesDraft)
    setMinutesProblem(!minutes)
    if (!minutes) return
    setMinutesDraft(formatDuration(minutes))
    if (minutes !== book.minutes) setLength({ minutes })
  }
  /** pages or minutes; for a book she only listens to, the other follows (#51) */
  function setLength(change: { pages?: number } | { minutes?: number }) {
    const patch = lengthPatch(book, change)
    onUpdate(patch)
    if ('pages' in patch) setPagesDraft(patch.pages?.toString() ?? '')
    if ('minutes' in patch) setMinutesDraft(patch.minutes ? formatDuration(patch.minutes) : '')
  }
  const audio = hasAudio(book)
  /** only listened to: the length sets the thickness and the progress is in time */
  const byTime = listenOnly(book) && !!book.minutes
  const [isbnDraft, setIsbnDraft] = useState(book.isbn ?? '')
  const [isbnProblem, setIsbnProblem] = useState(false)
  /** the ISBN as typed (#43): a valid ISBN-10 or -13, or empty to clear it */
  const saveIsbn = () => {
    if (!isbnDraft.trim()) {
      setIsbnProblem(false)
      if (book.isbn !== undefined) onUpdate({ isbn: undefined })
      return
    }
    const isbn = normalizeIsbn(isbnDraft)
    setIsbnProblem(!isbn)
    if (!isbn) return
    setIsbnDraft(isbn)
    if (isbn !== book.isbn) onUpdate({ isbn })
  }
  const [publishedDraft, setPublishedDraft] = useState(book.published ? formatPublished(book.published) : '')
  const [publishedProblem, setPublishedProblem] = useState(false)
  /** the publication date as typed (#44); the year follows it */
  const savePublished = () => {
    if (!publishedDraft.trim()) {
      setPublishedProblem(false)
      if (book.published !== undefined) onUpdate({ published: undefined })
      return
    }
    const published = parsePublished(publishedDraft)
    setPublishedProblem(!published)
    if (!published) return
    setPublishedDraft(formatPublished(published))
    if (published !== book.published) onUpdate({ published, year: publishedYear(published) })
  }
  /** the title being edited, or null */
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const cancelTitle = useRef(false)
  const [lentTo, setLentTo] = useState(book.lent?.to ?? '')
  // opens the Storytel app on a phone (#65)
  const storytel = storytelLink(book)
  const finished = book.finished ?? []
  const setFinished = (days: string[]) => onUpdate({ finished: days.length ? [...days].sort() : undefined })
  const started = book.started ?? []
  const setStarted = (days: string[]) => onUpdate({ started: days.length ? [...days].sort() : undefined })
  const [genreDraft, setGenreDraft] = useState('')
  const tidy = tidyTitle(book.title)
  const formats = formatsOf(book)
  const toggleFormat = (f: BookFormat) => {
    const patch = withFormats(formats.includes(f) ? formats.filter((x) => x !== f) : [...formats, f])
    const link = linkOnFormatChange(book, { ...book, ...patch })
    onUpdate({ ...patch, ...link })
    if (link.pages) setPagesDraft(String(link.pages))
    if (link.minutes) setMinutesDraft(formatDuration(link.minutes))
  }
  const languages =
    book.language && !LANGUAGE_CHOICES.includes(book.language)
      ? [...LANGUAGE_CHOICES, book.language]
      : LANGUAGE_CHOICES

  const rename = (title: string) => {
    const original = book.originalTitle ?? book.title
    // back to the original: nothing to remember any more
    onUpdate({ title, originalTitle: title === original ? undefined : original })
  }

  const addGenre = () => {
    const typed = genreDraft.trim().replace(/\s+/g, ' ')
    setGenreDraft('')
    if (!typed) return
    // use the existing spelling when there is one, so "fantasy" and "Fantasy" stay one genre
    const name =
      genreOptions.find((g) => g.toLowerCase() === typed.toLowerCase()) ??
      typed.charAt(0).toUpperCase() + typed.slice(1)
    const current = book.genres ?? []
    if (!current.some((g) => g.toLowerCase() === name.toLowerCase())) onUpdate({ genres: [...current, name] })
  }

  // what the text fields would save: only the parts that differ from the book
  const pendingPatch = (): Partial<Book> => {
    const patch: Partial<Book> = {}
    const title = titleDraft?.trim()
    if (title && title !== book.title && !cancelTitle.current) {
      const original = book.originalTitle ?? book.title
      patch.title = title
      patch.originalTitle = title === original ? undefined : original
    }
    if (book.lent && lentTo.trim() !== book.lent.to) patch.lent = { ...book.lent, to: lentTo.trim() }
    const n = Number(seriesNo)
    const index = seriesNo.trim() && Number.isFinite(n) ? n : undefined
    // a number on its own belongs to the series found from the title
    const name = seriesName.trim() || (index !== undefined ? detectedSeries?.name : undefined)
    const series = name || undefined
    const seriesIndex = name ? index : undefined
    if (series !== book.series || seriesIndex !== book.seriesIndex) {
      patch.series = series
      patch.seriesIndex = seriesIndex
    }
    const text = blurb.trim()
    // leaving it empty (or untouched) keeps the placeholder text
    const description = text && text !== backText({ ...book, description: undefined }) ? text : undefined
    if (description !== book.description) patch.description = description
    return patch
  }
  const save = () => {
    const patch = pendingPatch()
    if (Object.keys(patch).length) onUpdate(patch)
  }
  // closing the panel straight from a field (on a phone, without the field
  // losing focus first) must not lose what was typed
  const saveOnClose = useRef(save)
  saveOnClose.current = save
  useEffect(() => () => saveOnClose.current(), [])
  return (
    <aside
      ref={sheet.panel}
      className={sheet.isSheet ? 'panel sheet' : 'panel'}
      aria-label={`Details for ${book.title}`}
      style={sheet.height ? { height: sheet.height } : undefined}
    >
      <div className="sheet-grab" {...sheet.handlers}>
        {sheet.isSheet && <div className="sheet-handle" aria-hidden />}
        <div className="panel-top">
        <div className="panel-title">
          {titleDraft === null ? (
            <h2>
              {book.title}
              <button
                className="icon-btn rename"
                onClick={() => {
                  cancelTitle.current = false
                  setTitleDraft(book.title)
                }}
                aria-label="Rename"
                title="Rename"
              >
                ✎
              </button>
            </h2>
          ) : (
            <input
              className="input title-input"
              autoFocus
              aria-label="Title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  cancelTitle.current = true
                  e.currentTarget.blur()
                }
              }}
              onBlur={() => {
                save()
                setTitleDraft(null)
              }}
            />
          )}
          {titleDraft === null && tidy && (
            <button className="link-btn" onClick={() => rename(tidy)}>
              Shorten to “{tidy}”
            </button>
          )}
          {titleDraft === null && book.originalTitle && (
            <p className="muted renamed">
              Was “{book.originalTitle}” ·{' '}
              <button className="link-btn" onClick={() => rename(book.originalTitle!)}>
                Restore
              </button>
            </p>
          )}
          <p className="byline">{book.authors.join(', ') || 'Unknown author'}</p>
          <p className="muted">
            {[
              book.published ? formatPublished(book.published) : book.year,
              book.pages && !byTime && `${book.pages} pages`,
              audio && book.minutes && formatDuration(book.minutes),
              book.isbn && `ISBN ${book.isbn}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {storytel && (
            <a className="btn small storytel-link" href={storytel} target="_blank" rel="noopener noreferrer">
              <span aria-hidden>▶</span> Open in Storytel
            </a>
          )}
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Put back on the shelf">
          ×
        </button>
      </div>
      </div>

      <div className="side-pick" role="group" aria-label="Show side">
        <button onClick={() => onFace('front')}>Front</button>
        <button onClick={() => onFace('spine')}>Spine</button>
        <button onClick={() => onFace('back')}>Back</button>
      </div>
      <p className="hint">Drag to turn the book · ← → to flip · Esc to put it back</p>
      <button className="btn change-cover" onClick={onChangeCover}>
        Change cover…
      </button>

      <EdgesField book={book} onChange={(edges) => onUpdate({ edges })} />

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

      {(book.status === 'reading' || book.status === 'paused') && (
        <div className="field" role="group" aria-labelledby="progress-label">
          <span id="progress-label">Progress</span>
          <input
            className="range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={pct}
            aria-label="Progress"
            onChange={(e) => onProgress(Number(e.target.value) / 100)}
          />
          {/* or type it: a percentage, a page, or a listening time */}
          <div className="progress-inputs">
            <ProgressField
              label="Percentage"
              value={percentText(progress)}
              after="%"
              inputMode="decimal"
              width="3.6rem"
              parse={progressFromPercent}
              onProgress={onProgress}
            />
            {book.pages && !byTime ? (
              <ProgressField
                label="Page"
                before="page"
                value={pageText(progress, book.pages)}
                after={`of ${book.pages}`}
                inputMode="numeric"
                width="4rem"
                parse={(t) => progressFromPage(t, book.pages!)}
                onProgress={onProgress}
              />
            ) : null}
            {audio && book.minutes ? (
              <ProgressField
                label="Listening time"
                value={timeText(progress, book.minutes)}
                after={`of ${formatDuration(book.minutes)}`}
                width="6.5rem"
                parse={(t) => progressFromTime(t, book.minutes!)}
                onProgress={onProgress}
              />
            ) : null}
          </div>
        </div>
      )}

      {(book.status === 'read' || reads > 0) && (
        <div className="field">
          <span>Rating</span>
          <div className="rating-field">
            <StarRating value={book.rating} onChange={(rating) => onUpdate({ rating })} size="large" />
            <span className="muted small-text">{ratingText(book.rating)}</span>
          </div>
        </div>
      )}

      {(book.status === 'read' || reads > 0) && (
        <div className="field">
          <span>Spice</span>
          <div className="rating-field">
            <StarRating kind="spice" value={book.spice} onChange={(spice) => onUpdate({ spice })} size="large" />
            <button
              type="button"
              className="format-chip no-spice"
              aria-pressed={book.spice === NO_SPICE}
              onClick={() => onUpdate({ spice: book.spice === NO_SPICE ? undefined : NO_SPICE })}
            >
              No spice
            </button>
            <span className="muted small-text">{spiceText(book.spice)}</span>
          </div>
        </div>
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

      {(book.status === 'read' || reads > 0) && (
        <div className="field finished-days" role="group" aria-labelledby="finished-label">
          <span id="finished-label">Finished on</span>
          {finished.map((day, i) => (
            <div className="finished-day" key={`${i}-${day}`}>
              <input
                className="input"
                type="date"
                defaultValue={day}
                max={localDay()}
                aria-label={`Finished on, time ${i + 1}`}
                onBlur={(e) => {
                  const v = e.target.value
                  if (v && v !== day) setFinished(finished.map((d, j) => (j === i ? v : d)))
                }}
              />
              <button
                className="btn icon small"
                aria-label="Remove this date"
                onClick={() => setFinished(finished.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          {/* one date per time read */}
          {finished.length < reads && (
            <button className="btn small" onClick={() => setFinished([...finished, localDay()])}>
              + Add a date
            </button>
          )}
          {finished.length === 0 && <small className="muted">For the calendar on the dashboard.</small>}
        </div>
      )}

      {(book.status !== 'want' || started.length > 0) && (
        <div className="field finished-days" role="group" aria-labelledby="started-label">
          <span id="started-label">Started on</span>
          {started.map((day, i) => (
            <div className="finished-day" key={`${i}-${day}`}>
              <input
                className="input"
                type="date"
                defaultValue={day}
                max={localDay()}
                aria-label={`Started on, time ${i + 1}`}
                onBlur={(e) => {
                  const v = e.target.value
                  if (v && v !== day) setStarted(started.map((d, j) => (j === i ? v : d)))
                }}
              />
              <button
                className="btn icon small"
                aria-label="Remove this date"
                onClick={() => setStarted(started.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          {/* one date per time started: the times read, and the time she's reading it now */}
          {started.length < reads + (book.status === 'read' ? 0 : 1) && (
            <button className="btn small" onClick={() => setStarted([...started, localDay()])}>
              + Add a date
            </button>
          )}
          {started.length === 0 && <small className="muted">For “Started in …” on the dashboard.</small>}
        </div>
      )}

      <div className="field" role="group" aria-labelledby="formats-label">
        <span id="formats-label">How I have it</span>
        <div className="chips format-chips">
          {(Object.entries(FORMAT_LABELS) as Array<[BookFormat, string]>).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="format-chip"
              aria-pressed={formats.includes(k)}
              onClick={() => toggleFormat(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Sleep read</span>
        <div className="chips">
          <button
            type="button"
            className="format-chip"
            aria-pressed={!!book.sleepRead}
            onClick={() => onUpdate({ sleepRead: book.sleepRead ? undefined : true })}
          >
            🌙 Sleep read
          </button>
        </div>
        <small className="muted">A book you read to fall asleep: no rating question when you finish it.</small>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Language</span>
          <select
            className="input"
            value={book.language ?? ''}
            onChange={(e) => onUpdate({ language: e.target.value || undefined })}
          >
            <option value="">Not set</option>
            {languages.map((code) => (
              <option key={code} value={code}>
                {languageName(code)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field">
        <span>Genres</span>
        <div className="chips">
          {(book.genres ?? []).map((g) => (
            <span className="chip" key={g}>
              {g}
              <button aria-label={`Remove ${g}`} onClick={() => onUpdate({ genres: book.genres!.filter((x) => x !== g) })}>
                ×
              </button>
            </span>
          ))}
          <input
            className="input chip-input"
            list="genre-options"
            aria-label="Add a genre"
            placeholder={book.genres?.length ? 'Add…' : book.genres ? 'Add a genre…' : 'Looking up…'}
            value={genreDraft}
            onChange={(e) => setGenreDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addGenre()
              }
            }}
            onBlur={addGenre}
          />
          <datalist id="genre-options">
            {genreOptions
              .filter((g) => !book.genres?.includes(g))
              .map((g) => (
                <option key={g} value={g} />
              ))}
          </datalist>
        </div>
      </div>

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={!!book.lent}
            onChange={(e) => onUpdate({ lent: e.target.checked ? { to: lentTo.trim(), since: today() } : undefined })}
          />
          <span>Lent to a friend</span>
        </label>
        {book.lent && (
          <div className="field-row">
            <label className="field">
              <span>To</span>
              <input
                className="input"
                value={lentTo}
                placeholder="Name"
                autoFocus={!book.lent.to}
                onChange={(e) => setLentTo(e.target.value)}
                onBlur={save}
              />
            </label>
            <label className="field">
              <span>Since</span>
              <input
                className="input"
                type="date"
                value={book.lent.since ?? ''}
                onChange={(e) =>
                  onUpdate({ lent: { ...book.lent!, to: lentTo.trim(), since: e.target.value || undefined } })
                }
              />
            </label>
          </div>
        )}
      </div>

      <div className="field">
        <span>Series</span>
        <div className="series-row">
          <input
            className="input"
            value={seriesName}
            placeholder={detectedSeries && !book.series ? detectedSeries.name : 'Not in a series'}
            aria-label="Series name"
            onChange={(e) => setSeriesName(e.target.value)}
            onBlur={save}
          />
          <input
            className="input series-no"
            value={seriesNo}
            inputMode="decimal"
            placeholder={detectedSeries?.index && !book.series ? `#${detectedSeries.index}` : '#'}
            aria-label="Number in series"
            onChange={(e) => setSeriesNo(e.target.value.replace(/[^\d.]/g, ''))}
            onBlur={save}
          />
        </div>
      </div>

      <div className={audio ? 'field-row facts-row' : undefined}>
      <label className="field pages-field">
        <span>Pages</span>
        <input
          className="input"
          inputMode="numeric"
          value={pagesDraft}
          placeholder="Unknown"
          aria-describedby="pages-hint"
          onChange={(e) => setPagesDraft(e.target.value.replace(/\D/g, ''))}
          onBlur={savePages}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
        <small id="pages-hint" className="muted">
          {audio ? 'As in the printed book.' : 'As in your copy. Sets how thick the book is on the shelf.'}
        </small>
      </label>
      {audio && (
        <label className="field">
          <span>Length</span>
          <input
            className="input"
            value={minutesDraft}
            placeholder="e.g. 10:25"
            aria-invalid={minutesProblem}
            aria-describedby="minutes-hint"
            onChange={(e) => {
              setMinutesDraft(e.target.value)
              setMinutesProblem(false)
            }}
            onBlur={saveMinutes}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
          <small id="minutes-hint" className={minutesProblem ? 'error' : 'muted'}>
            {minutesProblem
              ? 'Try 10:25 or 10 h 25 min.'
              : listenOnly(book)
                ? 'Hours and minutes. A minute counts as a page on the shelf.'
                : 'Hours and minutes of the audiobook.'}
          </small>
        </label>
      )}
      </div>

      <div className="field-row facts-row">
        <label className="field">
          <span>ISBN</span>
          <input
            className="input"
            inputMode="numeric"
            value={isbnDraft}
            placeholder="Unknown"
            aria-invalid={isbnProblem}
            aria-describedby="isbn-hint"
            onChange={(e) => {
              setIsbnDraft(e.target.value.replace(/[^\dXx\s-]/g, ''))
              setIsbnProblem(false)
            }}
            onBlur={saveIsbn}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
          <small id="isbn-hint" className={isbnProblem ? 'error' : 'muted'}>
            {isbnProblem ? 'Not a valid ISBN: check the digits.' : 'On the back or the copyright page.'}
          </small>
        </label>
        <label className="field">
          <span>Published</span>
          <input
            className="input"
            value={publishedDraft}
            placeholder={book.year ? String(book.year) : 'e.g. 12.03.2008'}
            aria-invalid={publishedProblem}
            aria-describedby="published-hint"
            onChange={(e) => {
              setPublishedDraft(e.target.value)
              setPublishedProblem(false)
            }}
            onBlur={savePublished}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
          />
          <small id="published-hint" className={publishedProblem ? 'error' : 'muted'}>
            {publishedProblem ? 'Try 2008, 03.2008 or 12.03.2008.' : 'A year, month or full date.'}
          </small>
        </label>
      </div>

      <label className="field">
        <span>Back cover</span>
        <textarea
          className="input back-text"
          rows={5}
          value={blurb}
          onFocus={() => onFace('back')}
          onChange={(e) => setBlurb(e.target.value)}
          onBlur={() => {
            save()
            if (!blurb.trim()) setBlurb(backText({ ...book, description: undefined }))
          }}
        />
      </label>
      {!book.description && (
        <FindBackText
          book={book}
          onFound={(description) => {
            setBlurb(description)
            onUpdate({ description })
          }}
        />
      )}

      <MergeSection
        book={book}
        shelf={shelf}
        onMerge={onMerge}
        onNotDuplicate={(id) => onUpdate({ notDuplicates: [...(book.notDuplicates ?? []), id] })}
      />

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

/** Today as yyyy-mm-dd in local time, the format of a date input. */
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * One way to type the progress: shows where the book is, and saves what was
 * typed on Enter or when leaving the field. Escape, or something that isn't a
 * number, puts it back.
 */
function ProgressField({
  label,
  value,
  before,
  after,
  inputMode,
  width,
  parse,
  onProgress,
}: {
  label: string
  value: string
  before?: string
  after?: string
  inputMode?: 'numeric' | 'decimal'
  width: string
  parse: (text: string) => number | null
  onProgress: (progress: number) => void
}) {
  /** what's being typed, or null while the field shows the book's progress */
  const [draft, setDraft] = useState<string | null>(null)
  const cancel = useRef(false)
  const commit = () => {
    const p = draft === null || cancel.current ? null : parse(draft)
    if (p !== null) onProgress(p)
    cancel.current = false
    setDraft(null)
  }
  return (
    <label className="progress-input">
      {before && <span>{before}</span>}
      <input
        className="input"
        style={{ width }}
        inputMode={inputMode}
        aria-label={label}
        value={draft ?? value}
        onFocus={(e) => {
          setDraft(value)
          e.currentTarget.select()
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            e.stopPropagation()
            cancel.current = true
            e.currentTarget.blur()
          }
        }}
      />
      {after && <span>{after}</span>}
    </label>
  )
}

/** For a book without back text: look it up on Open Library. */
function FindBackText({ book, onFound }: { book: Book; onFound: (description: string) => void }) {
  const [state, setState] = useState<'idle' | 'busy' | 'none'>('idle')
  const find = async () => {
    setState('busy')
    const found = await findBackText(book).catch(() => undefined)
    if (found) onFound(found)
    else setState('none')
  }
  return (
    <div className="find-back-text">
      <button className="btn small" onClick={find} disabled={state === 'busy'}>
        {state === 'busy' ? 'Looking…' : 'Find back text'}
      </button>
      {state === 'none' && <small className="muted">No back text found for this book. You can type it in above.</small>}
    </div>
  )
}
