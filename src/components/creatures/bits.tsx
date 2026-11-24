import { useEffect, useRef, useState } from 'react'
import type { Tier } from '#/lib/creatures/species'
import { HOLD_MS } from '#/lib/creatures/numbers'
import { tierGems, tierWord } from '#/lib/creatures/words'

/** Small pieces of T-0030: a still picture, the tier line and the hold button. */

/**
 * A pre-rendered still picture (Design §1): lazy, fixed size, `alt=""` (the
 * text next to it says what it is). If it fails to load, the tile keeps its
 * size and shows a "?" like a hidden medal.
 */
export function Still({ src, size, className = '' }: { src: string; size: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (failed)
    return (
      <span className={`still-missing ${className}`} style={{ width: size, height: size }} aria-hidden>
        ?
      </span>
    )
  return (
    <img
      className={`still-img ${className}`}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

/** "◆◆◆ Rare": the gems show rarity without colour, the word says it (Design §6). */
export function TierLine({ tier, className = '' }: { tier: Tier; className?: string }) {
  return (
    <span className={`tier-line ${className}`}>
      <span className="tier-gems" aria-hidden>
        {tierGems(tier)}
      </span>{' '}
      <span className="tier-word">{tierWord(tier)}</span>
    </span>
  )
}

/**
 * The hold button (Design §5): only a 2 s press acts. Pointer down, or Space
 * or Enter down, starts a fill; letting go (or the pointer leaving) before the
 * end does nothing and the fill drains back. Key repeats are ignored.
 */
export function HoldButton({
  label,
  ariaLabel,
  describedBy,
  onDone,
  ms = HOLD_MS,
}: {
  label: string
  ariaLabel: string
  describedBy?: string
  onDone: () => void
  ms?: number
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = useRef(onDone)
  done.current = onDone
  const start = () => {
    if (timer.current) return
    setHolding(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setHolding(false)
      done.current()
    }, ms)
  }
  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }
  useEffect(() => stop, [])
  return (
    <button
      type="button"
      className={`btn hold-btn${holding ? ' holding' : ''}`}
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      style={{ ['--hold-ms' as string]: `${ms}ms` }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        start()
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return
        e.preventDefault()
        if (!e.repeat) start()
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') stop()
      }}
      onBlur={stop}
      // a click (a quick tap, or a screen reader's activate) never acts by itself
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-fill" aria-hidden />
      <span className="hold-label">{label}</span>
    </button>
  )
}

/** The "✨ This is a shiny!" warning box (Design §5, §7), labelled by its first line. */
export function ShinyWarning({ id, line }: { id: string; line: string }) {
  return (
    <div className="shiny-warning" role="group" aria-labelledby={`${id}-title`} id={id}>
      <p id={`${id}-title`}>
        <strong>✨ This is a shiny!</strong>
      </p>
      <p>{line}</p>
    </div>
  )
}
