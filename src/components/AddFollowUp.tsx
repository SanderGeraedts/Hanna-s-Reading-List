import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import type { Book, BookFormat } from '#/lib/library'
import { FORMAT_LABELS, formatsOf, withFormats } from '#/lib/library'
import { linkOnFormatChange } from '#/lib/listening'
import { asksEbookLink, asksPrice, parsePrice, priceField } from '#/lib/price'
import type { PriceProblem } from '#/lib/price'
import { cleanEbookLink } from '#/lib/ebookLink'
import { EBOOK_REFUSED } from './EbookLink'
import { PriceInput } from './PriceField'

/** What the dialog calls as it closes early: saves a valid price or link still in its field. */
export interface FollowUpHandle {
  flush: () => void
}

/**
 * The step after a book is added (T-0016): "How I have it", "What did it
 * cost?" for a bought copy, and the link for a free e-book. The book is on the
 * shelf already; every answer patches it at once, so closing midway loses
 * nothing that was valid.
 */
export function AddFollowUp({
  book,
  from,
  onUpdate,
  onDone,
  handle,
}: {
  book: Book
  /** the tab it was added from */
  from: string
  onUpdate: (id: string, patch: Partial<Book>) => void
  onDone: () => void
  handle: Ref<FollowUpHandle>
}) {
  const [step, setStep] = useState<'have' | 'link'>('have')
  const [priceDraft, setPriceDraft] = useState('')
  const [priceProblem, setPriceProblem] = useState<PriceProblem | null>(null)
  const [linkDraft, setLinkDraft] = useState('')
  const [linkProblem, setLinkProblem] = useState(false)
  const priceInput = useRef<HTMLInputElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  const firstChip = useRef<HTMLButtonElement>(null)
  /** a price was saved in this follow-up, for Skip to take back */
  const savedPrice = useRef(false)
  const id = useId()

  const formats = formatsOf(book)
  const showsPrice = asksPrice(formats, from)
  const typed = parsePrice(priceDraft)
  const next = showsPrice && typed.ok && asksEbookLink(formats, typed.price)

  // focus: into the price field when it already shows (a scanned paperback), else the first chip; the link field on step 2
  useEffect(() => {
    if (step === 'link') linkInput.current?.focus()
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

  const doneOrNext = () => {
    if (!savePrice()) return priceInput.current?.focus()
    if (next) setStep('link')
    else onDone()
  }

  // Skip: no price, also one saved a moment ago when the field lost focus to this button
  const skipPrice = () => {
    if (savedPrice.current || book.price !== undefined) onUpdate(book.id, { price: undefined })
    onDone()
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
      {step === 'have' ? (
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
              enterKeyHint={next ? 'next' : 'done'}
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
              {next ? 'Next' : 'Done'}
            </button>
          </div>
        </>
      ) : (
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
