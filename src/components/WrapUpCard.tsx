import { useEffect, useMemo } from 'react'
import type { Book } from '#/lib/library'
import { monthWrap } from '#/lib/wrapup'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover, monthName } from './common'
import { ShareButton } from './ShareButton'
import { StarRating } from './StarRating'

const hours = (minutes: number) => `${Math.round(minutes / 60)}`

/** The monthly wrap-up: the month's covers, numbers, book of the month and a fun fact; shareable as an image. */
export function WrapUpCard({
  books,
  year,
  month,
  onShowBook,
  onClose,
}: {
  books: Book[]
  year: number
  month: number
  onShowBook: (id: string) => void
  onClose: () => void
}) {
  const w = useMemo(() => monthWrap(books, year, month), [books, year, month])
  const name = monthName(month)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const numbers = [
    `${w.books.length} ${w.books.length === 1 ? 'book' : 'books'}`,
    w.pages > 0 && `${w.pages.toLocaleString('en-GB')} pages`,
    w.minutes > 0 && `${hours(w.minutes)} h listened`,
    w.readingDays > 0 && `${w.readingDays} reading ${w.readingDays === 1 ? 'day' : 'days'}`,
  ].filter(Boolean) as string[]

  const share = (): ShareSpec => ({
    title: `${name} ${year} in books`,
    subtitle: [numbers.join(' · '), w.fact].filter(Boolean).join(' · '),
    columns: w.books.length > 6 ? 4 : 3,
    aspect: 1.5,
    tiles: w.books.map((b) => ({ label: '', caption: b.title, cover: b.coverUrl, color: b.color, on: true })),
  })

  return (
    <div className="quick-backdrop" onClick={onClose}>
      <section className="quick-sheet wrapup-sheet" role="dialog" aria-modal="true" aria-labelledby="wrapup-title" onClick={(e) => e.stopPropagation()}>
        <div className="quick-head">
          <h2 id="wrapup-title">
            <span aria-hidden>✨ </span>
            {name} {year}
          </h2>
          <button className="btn icon small" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {w.books.length === 0 ? (
          <p className="muted">No books finished in {name}. A quiet month.</p>
        ) : (
          <>
            <ul className="wrapup-covers" aria-label={`Finished in ${name}`}>
              {w.books.map((b) => (
                <li key={b.id}>
                  <button className="cover-btn" aria-label={b.title} title={b.title} onClick={() => onShowBook(b.id)}>
                    <Cover book={b} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="wrapup-numbers">{numbers.join(' · ')}</p>
            {w.top && (
              <div className="wrapup-top">
                <button className="cover-btn" aria-label={w.top.title} onClick={() => onShowBook(w.top!.id)}>
                  <Cover book={w.top} />
                </button>
                <div>
                  <p className="muted small-text">Book of the month</p>
                  <p className="next-title">{w.top.title}</p>
                  <StarRating value={w.top.rating} size="small" />
                </div>
              </div>
            )}
            {w.fact && (
              <p className="wrapup-fact">
                <span aria-hidden>💡 </span>
                {w.fact}
              </p>
            )}
            <div className="wrapup-actions">
              <ShareButton spec={share} label={`${name} ${year} wrap-up`} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
