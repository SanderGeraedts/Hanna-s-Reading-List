import { useId, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { needsPlaces } from '#/lib/places'
import type { PlaceRow } from '#/lib/setIn'
import { addPlace, landsOn, placeKind, placeLabel, placeSuggestions, removePlace } from '#/lib/setIn'

const MARK = { country: '🌍', imaginary: '🗺️', other: '' } as const
const SPOKEN = { country: 'country', imaginary: 'made-up place', other: '' } as const

/**
 * "Set in" in the book panel (T-0015): the book's places as chips with ×, and
 * an Add box that suggests map countries and the lands on her other books.
 * Leaving the box adds nothing, so half a word never becomes a made-up place.
 * Every change makes the list hers (D-0023).
 */
export function SetInField({ book, shelf, onUpdate }: { book: Book; shelf: Book[]; onUpdate: (patch: Partial<Book>) => void }) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const places = book.places ?? []
  const lands = useMemo(() => landsOn(shelf.filter((b) => b.id !== book.id).map((b) => b.places)), [shelf, book.id])
  const rows = useMemo(() => placeSuggestions(draft, book.places, lands), [draft, book.places, lands])
  const shown = open && rows.length > 0
  const at = Math.min(active, rows.length - 1)

  const type = (value: string) => {
    setDraft(value)
    setOpen(true)
    setActive(0)
  }
  const pick = (row: PlaceRow | undefined) => {
    if (row) onUpdate({ places: addPlace(book.places, row.place) })
    // already on the book: nothing to add, the box is emptied all the same
    setDraft('')
    setActive(0)
  }
  const remove = (place: string) => {
    onUpdate({ places: removePlace(book.places, place) })
    input.current?.focus()
  }

  return (
    <div className="field setin">
      <span>Set in</span>
      <div className="chips">
        {places.map((p) => {
          const kind = placeKind(p)
          const label = placeLabel(p)
          return (
            <span className="chip" key={p}>
              {kind !== 'other' && <span aria-hidden>{MARK[kind]}</span>}
              <span className="setin-name">
                {label}
                {kind !== 'other' && <span className="visually-hidden">, {SPOKEN[kind]}</span>}
              </span>
              <button type="button" aria-label={`Remove ${label}`} onClick={() => remove(p)}>
                ×
              </button>
            </span>
          )
        })}
        <input
          ref={input}
          className="input chip-input"
          aria-label="Add a place"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={listId}
          aria-activedescendant={shown ? `${listId}-${at}` : undefined}
          placeholder={places.length ? 'Add…' : needsPlaces(book) ? 'Looking up…' : 'Add a place…'}
          value={draft}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              if (!open) return setOpen(true)
              if (rows.length) setActive((at + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              // no rows for text that's already on the book: just empty the box
              if (draft.trim()) pick(rows[at])
            } else if (e.key === 'Escape' && shown) {
              // closes the list, keeps the text (and the panel open)
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
            }
          }}
        />
      </div>
      <ul className="setin-list" id={listId} role="listbox" aria-label="Places" hidden={!shown}>
        {shown &&
          rows.map((r, i) => (
            <li
              key={`${r.add ? 'add:' : ''}${r.place}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === at}
              className={i === at ? 'active' : undefined}
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(r)}
            >
              <span aria-hidden>{MARK[r.kind]} </span>
              {r.add ? (r.kind === 'imaginary' ? `Add “${r.label}” as a made-up place` : `Add “${r.label}”`) : r.label}
            </li>
          ))}
      </ul>
    </div>
  )
}
