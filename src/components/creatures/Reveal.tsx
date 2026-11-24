import { useLayoutEffect, useRef, useState } from 'react'
import type { Pet } from '#/lib/creatures/creature'
import { cleanName, suggestedName } from '#/lib/creatures/creature'
import type { DuplicatePick } from '#/lib/creatures/choices'
import type { SpeciesId, Tier } from '#/lib/creatures/species'
import { aSpecies, duplicateCookies, levelLine, revealHeading, speciesWord } from '#/lib/creatures/words'
import { NameField } from './parts'
import { HoldButton, ShinyWarning, TierLine } from './bits'

/**
 * The reveal below the den after a hatch (T-0030 Design §3, §5): a new species
 * with the name step, or a duplicate with Keep / Turn into cookies / Power up.
 * On a shiny, cookies and power-up first show the "This is a shiny!" warning,
 * and only the 2 s hold acts.
 */

export interface RevealOf {
  egg: string
  tier: Tier
  species: SpeciesId
  shiny: boolean
  duplicate: boolean
}

type Phase = 'choice' | 'which' | 'warn' | 'name'

export function Reveal({
  of,
  headingRef,
  samePets,
  suggested,
  onNamed,
  onChoose,
}: {
  of: RevealOf
  headingRef: React.RefObject<HTMLHeadingElement | null>
  /** her pets of this species (for a power-up), in hatch order */
  samePets: Pet[]
  /** the first suggested name for the new pet */
  suggested: string
  /** the name step is done: the name she kept or typed */
  onNamed: (name: string) => void
  /** a duplicate choice; answers whether it was saved */
  onChoose: (pick: DuplicatePick, opts: { target?: string; held?: boolean }) => boolean
}) {
  const [phase, setPhase] = useState<Phase>(of.duplicate ? 'choice' : 'name')
  const [warn, setWarn] = useState<{ pick: 'cookies' | 'power'; target?: Pet } | null>(null)
  const [which, setWhich] = useState<string | null>(null)
  const focus = useRef<'heading' | 'which' | 'keepit' | 'choice' | null>(null)
  const whichRef = useRef<HTMLDivElement>(null)
  const keepItRef = useRef<HTMLButtonElement>(null)
  const powerBtnRef = useRef<HTMLButtonElement>(null)
  const word = speciesWord(of.species)
  const cookies = duplicateCookies(of.tier)
  const kept = phase === 'name' && of.duplicate

  useLayoutEffect(() => {
    const f = focus.current
    if (!f) return
    focus.current = null
    if (f === 'heading') headingRef.current?.focus()
    if (f === 'which') whichRef.current?.focus()
    if (f === 'keepit') keepItRef.current?.focus()
    if (f === 'choice') powerBtnRef.current?.focus()
  })

  const go = (p: Phase, f: typeof focus.current) => {
    focus.current = f
    setPhase(p)
  }
  const keep = () => {
    if (onChoose('keep', {})) go('name', 'heading')
  }
  const tryPick = (pick: 'cookies' | 'power', target?: Pet) => {
    if (of.shiny) {
      setWarn({ pick, target })
      go('warn', 'keepit')
      return
    }
    onChoose(pick, { target: target?.id })
  }
  const back = () => {
    setWarn(null)
    go('choice', 'heading')
  }

  return (
    <div
      className="den-below reveal"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && (phase === 'warn' || phase === 'which')) {
          e.preventDefault()
          back()
        }
      }}
    >
      <h2 ref={headingRef} tabIndex={-1}>
        {kept ? `Say hello to your new ${word}!` : revealHeading(of.species, of.duplicate)}
      </h2>
      {!kept && <TierLine tier={of.tier} />}
      {of.shiny && <p className="hello-shiny">✨ A shiny one!</p>}
      {!of.duplicate && <p className="reveal-new">New in your album!</p>}

      {phase === 'name' && <NameStep species={of.species} egg={of.egg} suggested={suggested} onDone={onNamed} />}

      {phase === 'choice' && (
        <div className="dup-choices">
          <button type="button" className="btn primary" onClick={keep}>
            Keep as a new pet
          </button>
          <button type="button" className="btn" aria-label={`Turn the ${word} into ${cookies} cookies`} onClick={() => tryPick('cookies')}>
            Turn into {cookies} <span aria-hidden>🍪</span>
          </button>
          {samePets.length === 1 && (
            <button
              ref={powerBtnRef}
              type="button"
              className="btn"
              aria-label={`Power up ${samePets[0].name} by 3 levels`}
              onClick={() => tryPick('power', samePets[0])}
            >
              Power up {samePets[0].name} (+3 levels)
            </button>
          )}
          {samePets.length > 1 && (
            <button ref={powerBtnRef} type="button" className="btn" onClick={() => go('which', 'which')}>
              Power up {aSpecies(of.species)} (+3 levels)
            </button>
          )}
        </div>
      )}

      {phase === 'which' && (
        <div className="dup-which">
          <div ref={whichRef} tabIndex={-1} role="radiogroup" aria-labelledby="which-title" className="which-list">
            <p id="which-title" className="which-title">
              <strong>Which {word}?</strong>
            </p>
            {samePets.map((p) => (
              <label key={p.id} className={`pet-row${which === p.id ? ' current' : ''}`}>
                <input type="radio" name="power-up" className="visually-hidden" value={p.id} checked={which === p.id} onChange={() => setWhich(p.id)} />
                <span className="pet-text">
                  <span className="pet-name">{p.name}</span>
                  <span className="pet-line">{levelLine(p)}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="chips">
            <button
              type="button"
              className="btn primary"
              disabled={!which}
              onClick={() => {
                const target = samePets.find((p) => p.id === which)
                if (target) tryPick('power', target)
              }}
            >
              Power up
            </button>
            <button type="button" className="btn" onClick={back}>
              Back
            </button>
          </div>
        </div>
      )}

      {phase === 'warn' && warn && (
        <div className="dup-warn">
          <ShinyWarning
            id="dup-warning"
            line={warn.pick === 'cookies' ? "Turning it into cookies can't be undone." : `Using it to power up ${warn.target!.name} can't be undone.`}
          />
          <div className="dup-choices">
            <button ref={keepItRef} type="button" className="btn primary" onClick={back}>
              Keep it
            </button>
            <HoldButton
              label={warn.pick === 'cookies' ? `Hold to turn into ${cookies} 🍪` : `Hold to power up ${warn.target!.name}`}
              ariaLabel={
                warn.pick === 'cookies'
                  ? `Hold to turn the shiny ${word} into ${cookies} cookies`
                  : `Hold to power up ${warn.target!.name} with the shiny ${word}`
              }
              describedBy="dup-warning"
              onDone={() => onChoose(warn.pick, { target: warn.target?.id, held: true })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/** The name step without its own heading (T-0029 §3d): the field filled with the suggestion, 🎲 and "That's the one!". */
function NameStep({ species, egg, suggested, onDone }: { species: SpeciesId; egg: string; suggested: string; onDone: (name: string) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(suggested)
  const [error, setError] = useState(false)
  const field = useRef<HTMLDivElement>(null)
  const done = () => {
    const clean = cleanName(name)
    if (!clean) return setError(true)
    onDone(clean)
  }
  return (
    <>
      <div ref={field}>
        <NameField
          id="reveal-name"
          value={name}
          error={error}
          onChange={(v) => {
            setName(v)
            if (error && v.trim()) setError(false)
          }}
          onEnter={done}
        />
      </div>
      <div className="chips">
        <button
          type="button"
          className="btn"
          aria-label="Another name"
          onClick={() => {
            const next = step + 1
            setStep(next)
            setName(suggestedName(species, egg, next))
            setError(false)
            const input = field.current?.querySelector('input')
            if (input && document.activeElement === input) requestAnimationFrame(() => input.select())
          }}
        >
          <span aria-hidden>🎲</span> Another name
        </button>
        <button type="button" className="btn primary" onClick={done}>
          That's the one!
        </button>
      </div>
    </>
  )
}
