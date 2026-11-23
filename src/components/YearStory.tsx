import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Book } from '#/lib/library'
import type { ShareSpec } from '#/lib/shareImage'
import { storySubtitle, yearStory } from '#/lib/yearStory'
import type { StorySlide } from '#/lib/yearStory'
import { Cover } from './Dashboard'
import { ShareButton } from './ShareButton'
import { StarRating } from './StarRating'

/**
 * The year wrap-up story (T-0081, D-0061): her year full screen, one fact per
 * slide, tapped through at her own pace. It opens only from ▶ Play, nothing
 * advances by itself, and the last slide is the one she shares as a picture
 * (drawn by the existing shareImage code).
 *
 * Nothing is saved: which slide she is on lives only while it is open.
 */
export function YearStory({
  books,
  year,
  onShowBook,
  onClose,
}: {
  books: Book[]
  year: number
  onShowBook: (id: string) => void
  onClose: () => void
}) {
  const story = yearStory(books, year)
  const [at, setAt] = useState(0)
  const slide: StorySlide = story.slides[Math.min(at, story.slides.length - 1)]
  const last = at >= story.slides.length - 1
  const stage = useRef<HTMLDivElement>(null)

  const next = useCallback(() => setAt((i) => Math.min(i + 1, story.slides.length - 1)), [story.slides.length])
  const back = useCallback(() => setAt((i) => Math.max(0, i - 1)), [])

  // the story takes the keyboard while it is open; focus comes back to ▶ Play on close
  useEffect(() => {
    const came = document.activeElement
    stage.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
        // a button in the story handles its own Enter and Space
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return
        e.preventDefault()
        next()
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (came instanceof HTMLElement && document.contains(came)) came.focus()
    }
  }, [onClose, next, back])

  const share = (): ShareSpec => ({
    title: `${year} in books`,
    subtitle: storySubtitle(story),
    columns: story.books.length > 6 ? 4 : 3,
    aspect: 1.5,
    tiles: story.books.slice(0, 12).map((b) => ({ label: '', caption: b.title, cover: b.coverUrl, color: b.color, on: true })),
  })

  // straight on the page, not inside the dashboard: the story covers the header too
  return createPortal(
    <div
      className="story-backdrop"
      // a tap anywhere moves on, except on the last slide, where only the buttons do
      onClick={last ? undefined : next}
    >
      <div
        className="story"
        role="dialog"
        aria-modal="true"
        aria-label={`${year} in books`}
        tabIndex={-1}
        ref={stage}
      >
        <div className="story-top">
          <ol className="story-progress" aria-label={`Slide ${at + 1} of ${story.slides.length}`}>
            {story.slides.map((s, i) => (
              <li key={s.id} className={i <= at ? 'done' : undefined} aria-hidden />
            ))}
          </ol>
          <button
            type="button"
            className="btn icon small story-close"
            aria-label="Close the story"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            ×
          </button>
        </div>

        <div className="story-slide" aria-live="polite">
          <h2 className="story-heading">{slide.title}</h2>
          {slide.kind === 'book' && slide.book ? (
            <div className="story-book">
              <button
                className="cover-btn"
                aria-label={slide.book.title}
                onClick={(e) => {
                  e.stopPropagation()
                  onShowBook(slide.book!.id)
                }}
              >
                <Cover book={slide.book} />
              </button>
              <p className="story-title">{slide.book.title}</p>
              {slide.stars !== undefined && <StarRating value={slide.stars} size="small" />}
              {slide.label && <p className="muted">{slide.label}</p>}
            </div>
          ) : slide.kind === 'summary' ? (
            <div className="story-summary">
              {story.empty ? (
                <p className="muted">{slide.label}</p>
              ) : (
                <>
                  <dl className="records">
                    {story.facts.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="story-line end">{story.closing}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {slide.value && <p className="story-value">{slide.value}</p>}
              {slide.label && <p className="story-label">{slide.label}</p>}
              {slide.places && slide.places.length > 0 && (
                <ul className="story-places">
                  {slide.places.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="story-actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn small" disabled={at === 0} onClick={back}>
            ‹ Back
          </button>
          {last ? (
            <>
              {!story.empty && <ShareButton spec={share} label={`your ${year} in books`} />}
              <button type="button" className="btn primary small" onClick={onClose}>
                Close
              </button>
            </>
          ) : (
            <button type="button" className="btn primary small" onClick={next}>
              Next ›
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
