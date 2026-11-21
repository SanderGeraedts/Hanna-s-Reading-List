import { useRef } from 'react'
import type { Book } from '#/lib/library'
import { timesRead } from '#/lib/library'
import { askedPatch } from '#/lib/ratingAsk'
import { joinSeries, notInSeries } from '#/lib/sleepSeries'
import type { SeriesQuestion } from '#/lib/sleepSeries'
import { ratingText, spiceText, NO_SPICE } from '#/lib/ratings'
import type { Badge } from '#/lib/badges'
import { StarRating } from './StarRating'
import { Cover } from './Dashboard'

interface Props {
  /** finished books whose finish hasn't been rated or skipped yet */
  toRate: Book[]
  /** new books by a series author, not answered yet */
  questions: SeriesQuestion[]
  onUpdate: (id: string, patch: Partial<Book>) => void
  onShowBook: (id: string) => void
  /** badges earned in the last week, not seen yet on this device */
  newBadges?: Badge[]
  onSeenBadge?: (id: string) => void
  /** in the first week of a month: last month's wrap-up, until opened or put away */
  wrapUp?: { label: string; onOpen: () => void; onDismiss: () => void }
  /** once a week: the want-to-read book that has waited longest (T-0014), until Not now */
  dustOff?: { book: Book; waited: string; onDismiss: () => void }
}

/**
 * "Waiting for you": what used to come up in pop-ups, waiting on the dashboard
 * instead. Finished books to rate (stars and peppers right here; Done or Skip
 * takes a book off the list) and new books that might belong to a series.
 * The dashboard leaves the block out when nothing is waiting.
 */
export function WaitingCard({ toRate, questions, onUpdate, onShowBook, newBadges = [], onSeenBadge, wrapUp, dustOff }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  return (
    <section className="dash-card waiting-card" aria-labelledby="waiting-title">
      <h2 id="waiting-title" ref={heading} tabIndex={-1}>
        Waiting for you
      </h2>
      {toRate.length === 0 && questions.length === 0 && newBadges.length === 0 && !wrapUp && !dustOff && (
        <p className="muted small-text">Nothing waiting.</p>
      )}
      {wrapUp && (
        <ul className="waiting-list">
          <li>
            <span className="badge-icon" aria-hidden>
              ✨
            </span>
            <div className="waiting-info">
              <p className="waiting-title">
                <strong>{wrapUp.label}</strong>
              </p>
              <div className="chips">
                <button type="button" className="btn small primary" onClick={wrapUp.onOpen}>
                  Open
                </button>
                <button type="button" className="btn small" onClick={wrapUp.onDismiss}>
                  Later
                </button>
              </div>
            </div>
          </li>
        </ul>
      )}
      {dustOff && (
        <ul className="waiting-list dust-off">
          <li>
            <button className="cover-btn" aria-label={`Open ${dustOff.book.title}`} onClick={() => onShowBook(dustOff.book.id)}>
              <Cover book={dustOff.book} small />
            </button>
            <div className="waiting-info">
              <p className="waiting-title">
                <strong>{dustOff.book.title}</strong>
                {dustOff.book.authors.length > 0 && <span className="muted small-text"> · {dustOff.book.authors.join(', ')}</span>}
              </p>
              <p className="waiting-title">Has waited {dustOff.waited} — give it a go?</p>
              <div className="chips">
                <button
                  type="button"
                  className="btn small primary tall"
                  aria-label={`Maybe, open ${dustOff.book.title}`}
                  onClick={() => onShowBook(dustOff.book.id)}
                >
                  Maybe
                </button>
                <button
                  type="button"
                  className="btn small tall"
                  aria-label={`Not now: ${dustOff.book.title}`}
                  onClick={() => {
                    heading.current?.focus()
                    dustOff.onDismiss()
                  }}
                >
                  Not now
                </button>
              </div>
            </div>
          </li>
        </ul>
      )}
      {newBadges.length > 0 && (
        <ul className="waiting-list">
          {newBadges.map((b) => (
            <li key={b.id}>
              <span className="badge-icon" aria-hidden>
                {b.icon}
              </span>
              <div className="waiting-info">
                <p className="waiting-title">
                  <strong>New badge: {b.name}!</strong>
                </p>
                <p className="muted small-text">{b.how}</p>
                {onSeenBadge && (
                  <div className="chips">
                    <button type="button" className="btn small primary" onClick={() => onSeenBadge(b.id)}>
                      Nice!
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {toRate.length > 0 && (
        <ul className="waiting-list">
          {toRate.map((b) => {
            const again = timesRead(b) > 1
            return (
              <li key={b.id}>
                <button className="cover-btn" aria-label={`Open ${b.title}`} onClick={() => onShowBook(b.id)}>
                  <Cover book={b} small />
                </button>
                <div className="waiting-info">
                  <p className="waiting-title">
                    <strong>{b.title}</strong>
                    <span className="muted small-text"> · {again ? 'You read it again!' : 'You finished it!'}</span>
                  </p>
                  <div className="waiting-rate">
                    <StarRating
                      value={b.rating}
                      onChange={(rating) => onUpdate(b.id, { rating })}
                      label={`Rating for ${b.title}`}
                    />
                    <span className="muted small-text">{ratingText(b.rating)}</span>
                  </div>
                  <div className="waiting-rate">
                    <StarRating
                      kind="spice"
                      value={b.spice}
                      onChange={(spice) => onUpdate(b.id, { spice })}
                      label={`Spice level for ${b.title}`}
                    />
                    <button
                      type="button"
                      className="format-chip no-spice"
                      aria-pressed={b.spice === NO_SPICE}
                      onClick={() => onUpdate(b.id, { spice: b.spice === NO_SPICE ? undefined : NO_SPICE })}
                    >
                      No spice
                    </button>
                    <span className="muted small-text">{spiceText(b.spice)}</span>
                  </div>
                  <div className="chips">
                    <button type="button" className="btn small" onClick={() => onUpdate(b.id, askedPatch(b))}>
                      {again && (b.rating || b.spice !== undefined) ? 'Still the same' : 'Done'}
                    </button>
                    <button type="button" className="btn small" onClick={() => onUpdate(b.id, askedPatch(b))}>
                      Skip
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {questions.length > 0 && (
        <>
          <h3 className="waiting-subtitle">Part of a series?</h3>
          <ul className="waiting-list">
            {questions.map(({ book, choices }) => (
              <li key={book.id}>
                <button className="cover-btn" aria-label={`Open ${book.title}`} onClick={() => onShowBook(book.id)}>
                  <Cover book={book} small />
                </button>
                <div className="waiting-info">
                  <p className="waiting-title">
                    <strong>{book.title}</strong>
                    {book.authors.length > 0 && <span className="muted small-text"> · {book.authors.join(', ')}</span>}
                  </p>
                  <div className="chips">
                    {choices.map((c) => (
                      <button key={c.key} type="button" className="btn small" onClick={() => onUpdate(book.id, joinSeries(c))}>
                        {c.sleep && '🌙 '}
                        {c.name}
                      </button>
                    ))}
                    <button type="button" className="btn small" onClick={() => onUpdate(book.id, notInSeries)}>
                      Not in a series
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
