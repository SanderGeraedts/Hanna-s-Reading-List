import { useEffect, useRef, useState } from 'react'
import type { Pet } from '#/lib/creatures/creature'
import { feedAmount } from '#/lib/creatures/creature'
import { FEED_SIZE, NAME_MAX } from '#/lib/creatures/numbers'
import { cookieNumber, growthText } from '#/lib/creatures/words'

/** Pieces the Creatures tab and the dashboard block share (T-0029 Design §4, §5, §8, §10). */

/** "🍪 23" in a gold-outlined pill; a screen reader hears "23 cookies". */
export function CookiePill({ n }: { n: number }) {
  return (
    <span className="cookie-pill">
      <span aria-hidden>🍪</span> {cookieNumber(n)}
      <span className="visually-hidden"> cookies</span>
    </span>
  )
}

/** The growth bar: how far into this level, as a progress bar. */
export function GrowthBar({ pet, numbers }: { pet: Pick<Pet, 'level' | 'into' | 'need'>; numbers?: boolean }) {
  const share = pet.need > 0 ? Math.min(1, pet.into / pet.need) : 0
  return (
    <div className="growth">
      <div
        className="growth-bar"
        role="progressbar"
        aria-label="Growth"
        aria-valuemin={0}
        aria-valuemax={pet.need}
        aria-valuenow={pet.into}
        aria-valuetext={growthText(pet)}
      >
        <span className="growth-fill" style={{ width: `${share * 100}%` }} />
      </div>
      {numbers && (
        <span className="growth-numbers" aria-hidden>
          {pet.into} / {pet.need}
        </span>
      )}
    </div>
  )
}

/**
 * "Feed 5 🍪" (or what's left); at 0 or below it stays "Feed 5 🍪", disabled
 * but focusable (`aria-disabled`), so its label is still read. A 🍪 hops from
 * the button toward the den on a tap (CSS; not with reduce motion).
 */
export function FeedButton({ name, balance, onFeed }: { name: string; balance: number; onFeed: () => void }) {
  const amount = feedAmount(balance)
  const shown = amount || FEED_SIZE
  const disabled = amount === 0
  const [hops, setHops] = useState<number[]>([])
  return (
    <span className="feed-wrap">
      <button
        type="button"
        className="btn primary feed-btn"
        aria-disabled={disabled || undefined}
        aria-label={`Feed ${name} ${shown} ${shown === 1 ? 'cookie' : 'cookies'}`}
        onClick={() => {
          if (disabled) return
          const id = Date.now() + Math.random()
          setHops((h) => [...h, id])
          setTimeout(() => setHops((h) => h.filter((x) => x !== id)), 520)
          onFeed()
        }}
      >
        Feed {shown} <span aria-hidden>🍪</span>
      </button>
      {hops.map((id) => (
        <span key={id} className="cookie-hop" aria-hidden>
          🍪
        </span>
      ))}
    </span>
  )
}

/**
 * The Name field (Design §3d, §5 Rename): filled, trimmed, 1 to 20
 * characters; an empty name shows "Give your creature a name." and isn't saved.
 *
 * `focusOnMount` (Rename): focus goes into the field with the name selected.
 * Without it (Say hello, where focus belongs on the heading, Design §10) the
 * field never takes focus by itself: in a browser `select()` also moves focus,
 * so the name is selected only when she first comes into the field.
 */
export function NameField({
  id,
  value,
  onChange,
  error,
  onEnter,
  onEscape,
  focusOnMount = false,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  error: boolean
  onEnter?: () => void
  onEscape?: () => void
  focusOnMount?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const selected = useRef(false)
  useEffect(() => {
    if (!focusOnMount || !input.current) return
    selected.current = true
    input.current.focus()
    input.current.select()
  }, [focusOnMount])
  return (
    <div className="name-field">
      <label htmlFor={id}>Name</label>
      <input
        ref={input}
        id={id}
        className="input"
        value={value}
        maxLength={NAME_MAX}
        autoComplete="off"
        aria-invalid={error || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          // the first time she comes into the field, the whole suggestion is selected
          if (selected.current) return
          selected.current = true
          e.currentTarget.select()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault()
            onEnter()
          }
          if (e.key === 'Escape' && onEscape) {
            e.preventDefault()
            onEscape()
          }
        }}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          Give your creature a name.
        </p>
      )}
    </div>
  )
}

/** Says something in a polite live region; the same words twice are read twice. */
export function useSay(): [string, (text: string) => void] {
  const [text, setText] = useState('')
  const say = (next: string) => {
    if (next !== text) return setText(next)
    setText('')
    setTimeout(() => setText(next), 50)
  }
  return [text, say]
}
