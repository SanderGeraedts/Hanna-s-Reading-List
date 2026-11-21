import { useEffect, useId, useRef, useState } from 'react'
import { cleanEbookLink, ebookHost, ebookHref } from '#/lib/ebookLink'

export const EBOOK_REFUSED = 'Only links that start with https:// or http:// can be opened here.'
const EBOOK_HINT = 'Where the file is, e.g. on Google Drive or your server.'

/**
 * "📖 Open e-book" (#185): opens the book's e-book link in a new tab. Shows
 * nothing unless the link is a web link, checked again here so nothing else
 * ever ends up in the `href`.
 */
export function EbookButton({ link }: { link: string | undefined }) {
  const href = ebookHref(link)
  if (!href) return null
  const name = `Open e-book (${ebookHost(link)}, opens in a new tab)`
  return (
    <a
      className="btn small ebook-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={name}
      aria-label={name}
    >
      <span aria-hidden>📖</span> Open e-book
    </a>
  )
}

/**
 * The e-book link in the book panel: "+ Add e-book link" when there is none,
 * otherwise a field with the link and a ×. Saved on Enter or on leaving the
 * field, like the ISBN; a link that isn't https:// or http:// stays in the
 * field with a note and isn't saved.
 */
export function EbookLinkField({
  link,
  onChange,
}: {
  link: string | undefined
  onChange: (link: string | undefined) => void
}) {
  const [open, setOpen] = useState(!!link)
  const [draft, setDraft] = useState(link ?? '')
  const [problem, setProblem] = useState(false)
  const cancel = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  /** where focus goes after the next render: into the field, or back to "+ Add e-book link" */
  const focusNext = useRef<'field' | 'add' | null>(null)
  const id = useId()

  // the link changed elsewhere (another device, a merge): show that one
  useEffect(() => {
    setDraft(link ?? '')
    setProblem(false)
    if (link) setOpen(true)
  }, [link])

  useEffect(() => {
    if (focusNext.current === 'field') input.current?.focus()
    if (focusNext.current === 'add') addButton.current?.focus()
    focusNext.current = null
  })

  const close = () => {
    setDraft('')
    setProblem(false)
    setOpen(false)
  }

  const save = () => {
    if (cancel.current) {
      // Escape: back to what was there
      cancel.current = false
      if (link) {
        setDraft(link)
        setProblem(false)
      } else close()
      return
    }
    if (!draft.trim()) {
      if (link !== undefined) onChange(undefined)
      close()
      return
    }
    const clean = cleanEbookLink(draft)
    setProblem(!clean)
    if (!clean) return
    setDraft(clean)
    if (clean !== link) onChange(clean)
  }

  const remove = () => {
    if (link !== undefined) onChange(undefined)
    close()
    focusNext.current = 'add'
  }

  if (!open) {
    return (
      <button
        ref={addButton}
        type="button"
        className="link-btn ebook-add"
        onClick={() => {
          setOpen(true)
          focusNext.current = 'field'
        }}
      >
        + Add e-book link
      </button>
    )
  }

  return (
    <div className="field ebook-field">
      <label htmlFor={`${id}-input`}>E-book link</label>
      <div className="ebook-row">
        <input
          ref={input}
          id={`${id}-input`}
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={draft}
          aria-invalid={problem}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            setDraft(e.target.value)
            setProblem(false)
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              e.stopPropagation()
              cancel.current = true
              e.currentTarget.blur()
            }
          }}
        />
        <button type="button" className="btn icon small ebook-remove" aria-label="Remove e-book link" onClick={remove}>
          ×
        </button>
      </div>
      <small id={`${id}-hint`} className={problem ? 'error' : 'muted'}>
        {problem ? EBOOK_REFUSED : EBOOK_HINT}
      </small>
    </div>
  )
}
