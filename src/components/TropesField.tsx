import { useState } from 'react'
import type { Book } from '#/lib/library'
import { addTrope, removeTrope, tropeSuggestions, tropesOf } from '#/lib/tropes'
import { addCharacter, charactersOf, removeCharacter, toggleFavourite } from '#/lib/characters'
import { suggest } from '#/lib/suggest'
import { Suggestions } from './Suggestions'

/**
 * The tropes of a book (D-0042), on the book panel's Notes tab: chips with an ×
 * each and a field that suggests the ready list plus every trope on the shelf.
 * A trope typed in another case joins the spelling the shelf already uses.
 */
export function TropesField({
  book,
  shelf,
  onUpdate,
}: {
  book: Book
  /** every book on the shelf, for the suggestions */
  shelf: Book[]
  onUpdate: (patch: Partial<Book>) => void
}) {
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const mine = tropesOf(book)

  const add = (value = draft) => {
    setDraft('')
    const patch = addTrope(book, value, shelf)
    if (patch) onUpdate(patch)
  }

  return (
    <div className="field">
      <span>Tropes</span>
      <div className="chips">
        {mine.map((t) => (
          <span className="chip" key={t}>
            {t}
            <button aria-label={`Remove ${t}`} onClick={() => onUpdate(removeTrope(book, t))}>
              ×
            </button>
          </span>
        ))}
        <input
          className="input chip-input"
          aria-label="Add a trope"
          placeholder={mine.length ? 'Add…' : 'Add a trope…'}
          value={draft}
          onFocus={() => setTyping(true)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={() => {
            setTyping(false)
            add()
          }}
        />
      </div>
      {/* the ready list and her own words; with an empty field a handful to tap straight away */}
      {typing && (
        <Suggestions
          names={suggest(
            tropeSuggestions(shelf).filter((t) => !mine.some((m) => m === t)),
            draft,
          )}
          onPick={(t) => add(t)}
        />
      )}
    </div>
  )
}

/** The characters of a book (D-0042): names with a ♥ for her favourites. */
export function CharactersField({ book, onUpdate }: { book: Book; onUpdate: (patch: Partial<Book>) => void }) {
  const [draft, setDraft] = useState('')
  const mine = charactersOf(book)

  const add = () => {
    const patch = addCharacter(book, draft)
    setDraft('')
    if (patch) onUpdate(patch)
  }

  return (
    <div className="field">
      <span>Characters</span>
      {mine.length > 0 && (
        <ul className="character-list">
          {mine.map((c) => (
            <li key={c.name}>
              <button
                type="button"
                className={c.fav ? 'icon-btn fav on' : 'icon-btn fav'}
                aria-pressed={!!c.fav}
                aria-label={c.fav ? `Not a favourite any more: ${c.name}` : `Favourite: ${c.name}`}
                onClick={() => onUpdate(toggleFavourite(book, c.name))}
              >
                {c.fav ? '♥' : '♡'}
              </button>
              <span className="character-name">{c.name}</span>
              <button
                className="btn icon small"
                aria-label={`Remove ${c.name}`}
                onClick={() => onUpdate(removeCharacter(book, c.name))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        className="input chip-input"
        aria-label="Add a character"
        placeholder={mine.length ? 'Add…' : 'Add a character…'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
        onBlur={add}
      />
    </div>
  )
}
