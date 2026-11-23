import { useMemo, useState } from 'react'
import { ChallengeFits } from './ChallengeFits'
import { FIT_MAX } from '#/lib/challengeFits'
import type { Book } from '#/lib/library'
import { LETTERS, alphabetYear, pickLetter, type AlphabetKind } from '#/lib/alphabet'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover } from './Dashboard'
import { ShareButton } from './ShareButton'
import { OpenLink } from './OpenLink'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  /** which challenge it opens on: titles (#143) or authors (#151); a switch changes it */
  kind?: AlphabetKind
  /** another year than this one, on the Challenges page */
  year?: number
  /** on the dashboard: the letters only, no tips or share */
  compact?: boolean
  onOpen?: () => void
}

/** The same line the other challenges say when her shelf has nothing for them (D-0069 §6). */
const ALPHABET_NONE = 'Nothing on your shelf fits a missing letter yet.'

const TITLES: Record<AlphabetKind, string> = { title: 'A–Z challenge', author: 'A–Z authors' }
const KINDS: Array<[AlphabetKind, string]> = [
  ['title', 'Titles'],
  ['author', 'Authors'],
]

/**
 * An A–Z challenge: a book for every letter this year, how it's going, and
 * tips from the pile. A letter that's done shows its book's cover (#150);
 * tapping it lets Hanna pick which of the books that count stands for it
 * (#152). See alphabet.ts.
 */
export function AlphabetCard({ books, onShowBook, onUpdate, kind: firstKind = 'title', year: forYear, compact = false, onOpen }: Props) {
  const year = forYear ?? new Date().getFullYear()
  // the titles and the authors challenge in one block, with a switch
  const [kind, setKind] = useState<AlphabetKind>(firstKind)
  const a = useMemo(() => alphabetYear(books, year, undefined, kind), [books, year, kind])
  const [open, setOpen] = useState<string | null>(null)
  const title = `${TITLES[kind]} ${year}`
  const id = `alphabet-${kind}-title`
  const choosing = open ? a.done.get(open) : undefined
  const options = open ? (a.options.get(open) ?? []) : []

  const share = (): ShareSpec => ({
    title,
    subtitle: a.pace,
    columns: 6,
    aspect: 1.5,
    tiles: LETTERS.map((l) => {
      const hit = a.done.get(l)
      return hit
        ? { label: l, cover: hit.book.coverUrl, color: hit.book.color, on: true }
        : { label: l, on: false }
    }),
  })

  return (
    <section className="dash-card" aria-labelledby={id}>
      <div className="dash-card-head">
        <h2 id={id}>{title}</h2>
        <OpenLink onOpen={onOpen} label="A–Z challenge" />
      </div>
      <div className="alphabet-switch">
        <div className="segmented" role="group" aria-label="Which A–Z challenge">
          {KINDS.map(([k, name]) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'active' : undefined}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k)
                setOpen(null)
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <span className={`small-text${a.onTrack ? ' muted' : ' alphabet-behind'}`}>{a.pace}</span>
      </div>
      {kind === 'author' && (
        <p className="muted small-text alphabet-rule">An author’s first name and surname both count.</p>
      )}
      <div className="alphabet" role="list" aria-label={title}>
        {LETTERS.map((l) => {
          const hit = a.done.get(l)
          if (!hit) {
            return (
              <span key={l} role="listitem" className="alphabet-letter" title={`${l}: not yet`} aria-label={`${l}: not yet`}>
                {l}
              </span>
            )
          }
          const count = a.options.get(l)?.length ?? 1
          const label = `${l}: ${hit.book.title}${count > 1 ? ` (${count} books count, tap to choose)` : ''}`
          return (
            <button
              key={l}
              role="listitem"
              className={`alphabet-letter on${open === l ? ' open' : ''}`}
              title={label}
              aria-label={label}
              aria-expanded={open === l}
              onClick={() => setOpen(open === l ? null : l)}
            >
              <span className="alphabet-cover" aria-hidden>
                <Cover book={hit.book} small />
              </span>
              <span className="alphabet-badge">{l}</span>
              {count > 1 && <span className="alphabet-more" aria-hidden>{count}</span>}
            </button>
          )
        })}
      </div>
      {open && choosing && (
        <div className="alphabet-choose">
          <p className="small-text">
            {options.length > 1 ? (
              <>
                Which book stands for <strong>{open}</strong>?
              </>
            ) : (
              <>
                <strong>{choosing.book.title}</strong> is the only book for <strong>{open}</strong> so far.
              </>
            )}
          </p>
          {options.length > 1 && (
            <ul className="alphabet-options">
              {options.map((b) => {
                const on = b.id === choosing.book.id
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={`alphabet-option${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        for (const [bookId, patch] of pickLetter(books, kind, year, open, b.id)) onUpdate(bookId, patch)
                      }}
                    >
                      <Cover book={b} small />
                      <span>{b.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button type="button" className="link-btn small-text" onClick={() => onShowBook(choosing.book.id)}>
            Show {choosing.book.title} on the shelf
          </button>
        </div>
      )}
      {!compact && a.done.size < LETTERS.length && (
        <ChallengeFits
          fits={a.tips.slice(0, FIT_MAX).map(({ letter, book }) => ({ book, why: `Letter ${letter}` }))}
          none={ALPHABET_NONE}
          onShowBook={onShowBook}
        />
      )}
      {!compact && (
        <div className="challenge-actions">
          <ShareButton spec={share} label={title} />
        </div>
      )}
    </section>
  )
}
