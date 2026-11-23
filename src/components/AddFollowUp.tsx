import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { Book, BookFormat } from '#/lib/library'
import { FORMAT_LABELS, formatsOf, withFormats } from '#/lib/library'
import { linkOnFormatChange } from '#/lib/listening'
import { asksEbookLink, asksPrice, parsePrice, priceField } from '#/lib/price'
import type { PriceProblem } from '#/lib/price'
import { cleanEbookLink } from '#/lib/ebookLink'
import { cleanBuyLink } from '#/lib/wishlist'
import { guessPatch, typedSeriesPatch } from '#/lib/seriesGuess'
import type { SeriesGuess } from '#/lib/seriesGuess'
import { EBOOK_REFUSED } from './EbookLink'
import { PriceInput } from './PriceField'

/** What the dialog calls as it closes early: saves a valid price or link still in its field. */
export interface FollowUpHandle {
  flush: () => void
}

type Step = 'have' | 'series' | 'link'

/**
 * The step after a book is added (T-0016): "How I have it", "What did it
 * cost?" for a bought copy, "Part of a series?" (T-0070) and the link for a
 * free e-book. The book is on the shelf already; every answer patches it at
 * once, so closing midway loses nothing that was valid.
 */
export function AddFollowUp({
  book,
  from,
  onUpdate,
  onDone,
  handle,
  seriesGuesses = [],
  askSeries = false,
  initialPrice,
}: {
  book: Book
  /** the tab it was added from */
  from: string
  onUpdate: (id: string, patch: Partial<Book>) => void
  onDone: () => void
  handle: Ref<FollowUpHandle>
  /** rule-based series guesses to confirm with one tap (T-0070, D-0017: no AI) */
  seriesGuesses?: SeriesGuess[]
  /** whether the "Part of a series?" step is asked at all */
  askSeries?: boolean
  /** a price already known, e.g. what she wished this book would cost (D-0044) */
  initialPrice?: number
}) {
  const [step, setStep] = useState<Step>('have')
  const [priceDraft, setPriceDraft] = useState(() => priceField(initialPrice))
  const [priceProblem, setPriceProblem] = useState<PriceProblem | null>(null)
  const [linkDraft, setLinkDraft] = useState('')
  const [linkProblem, setLinkProblem] = useState(false)
  const [seriesDraft, setSeriesDraft] = useState('')
  /** the guess whose chip is pressed, by name; typing in the field un-presses it */
  const [chosen, setChosen] = useState<SeriesGuess | null>(null)
  const priceInput = useRef<HTMLInputElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  const seriesInput = useRef<HTMLInputElement>(null)
  const firstChip = useRef<HTMLButtonElement>(null)
  const firstGuess = useRef<HTMLButtonElement>(null)
  /** a price was saved in this follow-up, for Skip to take back */
  const savedPrice = useRef(false)
  const id = useId()

  const formats = formatsOf(book)
  const showsPrice = asksPrice(formats, from)
  const typed = parsePrice(priceDraft)
  const needsLink = showsPrice && typed.ok && asksEbookLink(formats, typed.price)

  // focus: into the price field when it already shows (a scanned paperback), else the first
  // chip; the first series guess (or its field) on the series step; the link field on the last
  useEffect(() => {
    if (step === 'link') linkInput.current?.focus()
    else if (step === 'series') (firstGuess.current ?? seriesInput.current)?.focus()
    else (showsPrice ? priceInput.current : firstChip.current)?.focus()
    // only when a step appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const toggle = (f: BookFormat) => {
    const patch = withFormats(formats.includes(f) ? formats.filter((x) => x !== f) : [...formats, f])
    const nextBook = { ...book, ...patch }
    const hidesPrice = !asksPrice(formatsOf(nextBook), from)
    // unticking the last bought format hides the price field, and what was in it isn't kept
    const dropPrice = hidesPrice && (savedPrice.current || book.price !== undefined)
    if (hidesPrice) {
      setPriceDraft('')
      setPriceProblem(null)
      savedPrice.current = false
    }
    onUpdate(book.id, { ...patch, ...linkOnFormatChange(book, nextBook), ...(dropPrice && { price: undefined }) })
  }

  /** Saves the price in the field; false when it isn't a price. */
  const savePrice = (): boolean => {
    if (!showsPrice) return true
    const parsed = parsePrice(priceDraft)
    if (!parsed.ok) {
      setPriceProblem(parsed.problem)
      return false
    }
    setPriceProblem(null)
    setPriceDraft(priceField(parsed.price))
    if (parsed.price !== book.price) onUpdate(book.id, { price: parsed.price })
    savedPrice.current = parsed.price !== undefined
    return true
  }

  /** The step after "How I have it", or nothing left to ask. */
  const afterHave = (): Step | null => (askSeries ? 'series' : needsLink ? 'link' : null)
  const afterSeries = (): Step | null => (needsLink ? 'link' : null)
  const go = (to: Step | null) => (to ? setStep(to) : onDone())

  const doneOrNext = () => {
    if (!savePrice()) return priceInput.current?.focus()
    go(afterHave())
  }

  // Skip: no price, also one saved a moment ago when the field lost focus to this button
  const skipPrice = () => {
    if (savedPrice.current || book.price !== undefined) onUpdate(book.id, { price: undefined })
    onDone()
  }

  /** Saves the series she confirmed or typed, and never asks again. */
  const saveSeries = () => {
    onUpdate(book.id, chosen && chosen.name === seriesDraft.trim() ? guessPatch(chosen) : typedSeriesPatch(seriesDraft))
  }
  const doneSeries = () => {
    saveSeries()
    go(afterSeries())
  }
  const skipSeries = () => {
    onUpdate(book.id, { seriesAsked: true })
    go(afterSeries())
  }

  const doneLink = () => {
    if (!linkDraft.trim()) return onDone()
    const clean = cleanEbookLink(linkDraft)
    if (!clean) {
      setLinkProblem(true)
      return linkInput.current?.focus()
    }
    if (clean !== book.ebookUrl) onUpdate(book.id, { ebookUrl: clean })
    onDone()
  }

  useImperativeHandle(handle, () => ({
    flush: () => {
      if (step === 'have') {
        const parsed = parsePrice(priceDraft)
        if (showsPrice && parsed.ok && parsed.price !== book.price) onUpdate(book.id, { price: parsed.price })
      } else if (step === 'series') {
        if (seriesDraft.trim()) saveSeries()
      } else {
        const clean = cleanEbookLink(linkDraft)
        if (clean && clean !== book.ebookUrl) onUpdate(book.id, { ebookUrl: clean })
      }
    },
  }))

  return (
    <div className="tab-panel add-follow-up">
      <p className="success" role="status">
        Added “{book.title}”.
      </p>
      {step === 'have' && (
        <>
          <div className="field" role="group" aria-labelledby={`${id}-formats`}>
            <span id={`${id}-formats`}>How I have it</span>
            <div className="chips format-chips">
              {(Object.entries(FORMAT_LABELS) as Array<[BookFormat, string]>).map(([k, label], i) => (
                <button
                  key={k}
                  ref={i === 0 ? firstChip : undefined}
                  type="button"
                  className="format-chip"
                  aria-pressed={formats.includes(k)}
                  onClick={() => toggle(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {showsPrice && (
            <PriceInput
              inputRef={priceInput}
              label={
                <>
                  What did it cost?<span className="visually-hidden"> (euros)</span>
                </>
              }
              problem={priceProblem}
              value={priceDraft}
              enterKeyHint={afterHave() ? 'next' : 'done'}
              onChange={(e) => {
                setPriceDraft(e.target.value)
                setPriceProblem(null)
              }}
              onBlur={() => {
                savePrice()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  doneOrNext()
                }
              }}
            />
          )}
          <div className="follow-up-actions">
            <button type="button" className="btn" onClick={skipPrice}>
              Skip
            </button>
            <button type="button" className="btn primary" onClick={doneOrNext}>
              {afterHave() ? 'Next' : 'Done'}
            </button>
          </div>
        </>
      )}
      {step === 'series' && (
        <>
          <div className="field" role="group" aria-labelledby={`${id}-series`}>
            <span id={`${id}-series`}>Part of a series?</span>
            {seriesGuesses.length > 0 && (
              <div className="chips series-chips">
                {seriesGuesses.map((g, i) => (
                  <button
                    key={g.name}
                    ref={i === 0 ? firstGuess : undefined}
                    type="button"
                    className="format-chip"
                    aria-pressed={chosen?.name === g.name && seriesDraft.trim() === g.name}
                    onClick={() => {
                      const on = chosen?.name === g.name && seriesDraft.trim() === g.name
                      setChosen(on ? null : g)
                      setSeriesDraft(on ? '' : g.name)
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor={`${id}-series-name`}>Series name</label>
            <input
              ref={seriesInput}
              id={`${id}-series-name`}
              className="input"
              type="text"
              autoComplete="off"
              enterKeyHint={afterSeries() ? 'next' : 'done'}
              value={seriesDraft}
              onChange={(e) => {
                setSeriesDraft(e.target.value)
                setChosen(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  doneSeries()
                }
              }}
            />
          </div>
          <div className="follow-up-actions">
            <button type="button" className="btn" onClick={skipSeries}>
              Skip
            </button>
            <button type="button" className="btn primary" onClick={doneSeries}>
              {afterSeries() ? 'Next' : 'Done'}
            </button>
          </div>
        </>
      )}
      {step === 'link' && (
        <>
          <div className="field">
            <label htmlFor={`${id}-link`}>E-book link</label>
            <input
              ref={linkInput}
              id={`${id}-link`}
              className="input"
              type="url"
              inputMode="url"
              placeholder="https://…"
              enterKeyHint="done"
              value={linkDraft}
              aria-invalid={linkProblem}
              aria-describedby={linkProblem ? `${id}-link-error` : undefined}
              onChange={(e) => {
                setLinkDraft(e.target.value)
                setLinkProblem(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  doneLink()
                }
              }}
            />
            {linkProblem && (
              <small id={`${id}-link-error`} className="error">
                {EBOOK_REFUSED}
              </small>
            )}
          </div>
          <div className="follow-up-actions">
            <button type="button" className="btn" onClick={onDone}>
              Skip
            </button>
            <button type="button" className="btn primary" onClick={doneLink}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * The step after a book is added **to the wishlist** (T-0072): what it will
 * cost and where to buy it, both of which she may leave empty. One step, not
 * two: a wish has only these two things to ask.
 */
export function WishFollowUp({
  book,
  onUpdate,
  onDone,
  handle,
}: {
  book: Book
  onUpdate: (id: string, patch: Partial<Book>) => void
  onDone: () => void
  handle: Ref<FollowUpHandle>
}) {
  const [priceDraft, setPriceDraft] = useState(() => priceField(book.price))
  const [priceProblem, setPriceProblem] = useState<PriceProblem | null>(null)
  const [linkDraft, setLinkDraft] = useState(book.buyUrl ?? '')
  const [linkProblem, setLinkProblem] = useState(false)
  const priceInput = useRef<HTMLInputElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  const id = useId()

  useEffect(() => {
    priceInput.current?.focus()
  }, [])

  /** Saves both fields; false when one of them is not a price or not a web link. */
  const save = (): boolean => {
    const parsed = parsePrice(priceDraft)
    if (!parsed.ok) {
      setPriceProblem(parsed.problem)
      priceInput.current?.focus()
      return false
    }
    const typedLink = linkDraft.trim()
    const clean = typedLink ? cleanBuyLink(typedLink) : undefined
    if (typedLink && !clean) {
      setLinkProblem(true)
      linkInput.current?.focus()
      return false
    }
    setPriceProblem(null)
    setLinkProblem(false)
    const patch: Partial<Book> = {}
    if (parsed.price !== book.price) patch.price = parsed.price
    if (clean !== book.buyUrl) patch.buyUrl = clean
    if (Object.keys(patch).length) onUpdate(book.id, patch)
    return true
  }

  useImperativeHandle(handle, () => ({
    flush: () => {
      const parsed = parsePrice(priceDraft)
      const clean = cleanBuyLink(linkDraft)
      const patch: Partial<Book> = {}
      if (parsed.ok && parsed.price !== book.price) patch.price = parsed.price
      if (clean && clean !== book.buyUrl) patch.buyUrl = clean
      if (Object.keys(patch).length) onUpdate(book.id, patch)
    },
  }))

  return (
    <div className="tab-panel add-follow-up">
      <p className="success" role="status">
        Added “{book.title}” to your wishlist.
      </p>
      <PriceInput
        inputRef={priceInput}
        label={
          <>
            What will it cost?<span className="visually-hidden"> (euros)</span>
          </>
        }
        problem={priceProblem}
        value={priceDraft}
        enterKeyHint="next"
        onChange={(e) => {
          setPriceDraft(e.target.value)
          setPriceProblem(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            linkInput.current?.focus()
          }
        }}
      />
      <div className="field">
        <label htmlFor={`${id}-buy`}>Where to buy it</label>
        <input
          ref={linkInput}
          id={`${id}-buy`}
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://…"
          enterKeyHint="done"
          value={linkDraft}
          aria-invalid={linkProblem}
          aria-describedby={linkProblem ? `${id}-buy-error` : undefined}
          onChange={(e) => {
            setLinkDraft(e.target.value)
            setLinkProblem(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (save()) onDone()
            }
          }}
        />
        {linkProblem && (
          <small id={`${id}-buy-error`} className="error">
            {EBOOK_REFUSED}
          </small>
        )}
      </div>
      <div className="follow-up-actions">
        <button type="button" className="btn" onClick={onDone}>
          Skip
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (save()) onDone()
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
