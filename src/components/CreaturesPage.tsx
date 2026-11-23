import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { speciesById } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import { cleanName, isShinyEgg, suggestedName } from '#/lib/creatures/creature'
import type { Creatures, Pet } from '#/lib/creatures/creature'
import { minutesText } from '#/lib/creatures/cookies'
import type { WeekLine } from '#/lib/creatures/cookies'
import { addDays } from '#/lib/creatures/days'
import { CHOICE_LABEL, SPECIES_WORD, WELCOME_CHOICES, WELCOME_EGG } from '#/lib/creatures/numbers'
import { EGG_DESCRIPTION, denDescription, displayName, levelLine, moodLine, nextLine } from '#/lib/creatures/words'
import { useCreatures } from './creatures/CreaturesContext'
import { CookiePill, FeedButton, GrowthBar, NameField, useSay } from './creatures/parts'
import { usePhone, useReducedMotion, webglAvailable } from './creatures/pose'
import { DenScene } from './creatures/DenScene'
import type { Reaction } from './creatures/DenScene'
import { ChooseScene } from './creatures/ChooseScene'
import type { Tile } from './creatures/ChooseScene'
import { SceneBoundary } from './creatures/SceneBoundary'

/**
 * The Creatures tab (T-0029 Design §2–§7, §10, §12): her creature in its den
 * with its name, level, stage and the cookie balance, Feed and Rename, and
 * *This week* with what she earned each day. Before the hatch it holds the
 * welcome flow: the egg, *Choose your first creature*, the crack and *Say
 * hello* (in the tab, never a pop-up). Album, shop and tricks come later.
 */

interface Props {
  books: Book[]
  /** a Hatch button elsewhere (Waiting for you, the block) opened the tab: go straight to choosing */
  startChoose?: boolean
  /** the choose step has been opened from `startChoose` (so a reload doesn't open it again) */
  onChooseOpened?: () => void
  /** something is over the page (the book panel, a sheet): the den stops rendering */
  paused?: boolean
}

type Step = 'egg' | 'choose' | 'crack' | 'hello' | 'home'

export function CreaturesPage({ books, startChoose, onChooseOpened, paused }: Props) {
  const { c, api, feed } = useCreatures(books)
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const [said, say] = useSay()
  const [stepState, setStep] = useState<Step>(() => (startChoose ? 'choose' : 'egg'))
  const [reaction, setReaction] = useState<Reaction | null>(null)
  const hatchBtn = useRef<HTMLButtonElement>(null)
  const chooseHeading = useRef<HTMLHeadingElement>(null)
  const helloHeading = useRef<HTMLHeadingElement>(null)
  const nameHeading = useRef<HTMLHeadingElement>(null)
  /** where focus goes after the next render */
  const focusNext = useRef<'choose' | 'hatch' | 'hello' | 'name' | null>(startChoose ? 'choose' : null)

  const pet = c.pet
  const step: Step = pet ? (stepState === 'crack' || stepState === 'hello' ? stepState : 'home') : stepState === 'choose' ? 'choose' : 'egg'

  useEffect(() => {
    if (startChoose) onChooseOpened?.()
  }, [startChoose, onChooseOpened])

  useLayoutEffect(() => {
    const f = focusNext.current
    if (!f) return
    const el = { choose: chooseHeading, hatch: hatchBtn, hello: helloHeading, name: nameHeading }[f].current
    if (el) {
      el.focus()
      focusNext.current = null
    }
  })

  const go = (next: Step, focus?: typeof focusNext.current) => {
    focusNext.current = focus ?? null
    setStep(next)
  }

  const hatch = (species: SpeciesId) => {
    // saved on the tap, before the crack, so a reload mid-crack never loses it (Design §3c)
    api.choices.hatch(species)
    const shiny = api.forceShiny || isShinyEgg(WELCOME_EGG)
    const word = SPECIES_WORD[species] ?? speciesById(species).name
    say(`Your ${word} hatched!${shiny ? ' A shiny one!' : ''}`)
    if (gl) go('crack')
    else go('hello', 'hello')
  }

  if (!c.started) {
    return (
      <div className="dashboard">
        <div className="creatures-page">
          <header className="challenges-head creatures-head">
            <h1>Creatures</h1>
          </header>
          <p className="creatures-empty">Your creatures arrive soon.</p>
        </div>
      </div>
    )
  }

  const shows =
    step === 'crack' && pet
      ? ({ kind: 'crack', species: pet.species, shiny: pet.shiny } as const)
      : pet
        ? ({ kind: 'creature', species: pet.species, shiny: pet.shiny, stage: pet.stage, mood: pet.mood } as const)
        : ({ kind: 'egg' } as const)

  return (
    <div className="dashboard">
      <div className="creatures-page">
        <header className="challenges-head creatures-head">
          <h1>Creatures</h1>
          <div className="creatures-earn">
            <CookiePill n={c.balance} />
            {c.earnedToday > 0 && <span className="creatures-today">+{c.earnedToday} today</span>}
          </div>
        </header>
        <div className={`creatures-layout${pet && step === 'home' ? '' : ' no-card'}`}>
          <section className="dash-card den-card" aria-label={step === 'choose' ? undefined : 'The den'}>
            {step === 'choose' ? (
              <ChooseStep
                headingRef={chooseHeading}
                phone={phone}
                reduce={reduce}
                gl={gl}
                onGl={() => setGl(false)}
                onHatch={hatch}
                onNotYet={() => go('egg', 'hatch')}
              />
            ) : (
              <>
                {gl && (
                  <div className="den-stage">
                    <SceneBoundary onFail={() => setGl(false)}>
                      <DenScene
                        shows={shows}
                        cookies={c.balance}
                        phone={phone}
                        reduce={reduce}
                        paused={paused}
                        reaction={reaction}
                        onCrackDone={() => go('hello', 'hello')}
                      />
                    </SceneBoundary>
                    <p className="visually-hidden">{pet ? denDescription(pet) : EGG_DESCRIPTION}</p>
                  </div>
                )}
                {step === 'egg' && (
                  <div className="den-below">
                    <h2>A welcome egg</h2>
                    <button ref={hatchBtn} type="button" className="btn primary" onClick={() => go('choose', 'choose')}>
                      Hatch
                    </button>
                  </div>
                )}
                {step === 'hello' && pet && (
                  <HelloStep
                    pet={pet}
                    headingRef={helloHeading}
                    onDone={(name) => {
                      if (name !== pet.suggested) api.choices.rename(pet.id, name)
                      go('home', 'name')
                    }}
                  />
                )}
              </>
            )}
          </section>
          <div className="creatures-side">
            {pet && step === 'home' && (
              <CreatureCard
                pet={pet}
                balance={c.balance}
                nameRef={nameHeading}
                onRename={(name) => {
                  api.choices.rename(pet.id, name)
                  say(`Renamed to ${name}.`)
                }}
                onFeed={() => {
                  const r = feed()
                  if (!r) return
                  say(r.say)
                  setReaction((prev) => ({ kind: r.levelUp ? 'levelup' : 'feed', n: (prev?.n ?? 0) + 1 }))
                }}
              />
            )}
            <WeekCard c={c} phone={phone} />
          </div>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {said}
        </p>
      </div>
    </div>
  )
}

// ---- 3b: choose your first creature -------------------------------------------------------

function ChooseStep({
  headingRef,
  phone,
  reduce,
  gl,
  onGl,
  onHatch,
  onNotYet,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  phone: boolean
  reduce: boolean
  gl: boolean
  onGl: () => void
  onHatch: (species: SpeciesId) => void
  onNotYet: () => void
}) {
  const [picked, setPicked] = useState<SpeciesId | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const squares = useRef<Array<HTMLDivElement | null>>([])
  const [tiles, setTiles] = useState<Tile[]>([])

  useLayoutEffect(() => {
    const el = grid.current
    if (!el) return
    const measure = () => {
      const box = el.getBoundingClientRect()
      setTiles(
        squares.current.map((sq) => {
          const r = sq?.getBoundingClientRect()
          if (!r) return { x: 0, y: 0, size: 0 }
          return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, size: r.width }
        }),
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      className="choose"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onNotYet()
        }
      }}
    >
      <h2 ref={headingRef} tabIndex={-1} id="choose-title">
        Choose your first creature
      </h2>
      <div className="choose-grid" ref={grid} role="radiogroup" aria-labelledby="choose-title">
        {gl && (
          <SceneBoundary onFail={onGl}>
            <ChooseScene species={WELCOME_CHOICES} tiles={tiles} picked={picked} phone={phone} reduce={reduce} />
          </SceneBoundary>
        )}
        {WELCOME_CHOICES.map((s, i) => (
          <label key={s} className={`choose-tile${picked === s ? ' picked' : ''}`}>
            <input
              type="radio"
              name="first-creature"
              className="visually-hidden"
              value={s}
              checked={picked === s}
              onChange={() => setPicked(s)}
            />
            <div
              className="choose-square"
              ref={(el) => {
                squares.current[i] = el
              }}
            />
            <span className="choose-name">{speciesById(s).name}</span>
          </label>
        ))}
      </div>
      <div className="chips choose-actions">
        <button
          type="button"
          className="btn primary"
          disabled={!picked}
          onClick={() => {
            if (picked) onHatch(picked)
          }}
        >
          {picked ? `Hatch ${CHOICE_LABEL[picked]}` : 'Hatch'}
        </button>
        <button type="button" className="btn" onClick={onNotYet}>
          Not yet
        </button>
      </div>
    </div>
  )
}

// ---- 3d: say hello ------------------------------------------------------------------------

function HelloStep({ pet, headingRef, onDone }: { pet: Pet; headingRef: React.RefObject<HTMLHeadingElement | null>; onDone: (name: string) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(pet.suggested)
  const [error, setError] = useState(false)
  const field = useRef<HTMLDivElement>(null)
  const word = SPECIES_WORD[pet.species] ?? speciesById(pet.species).name.toLowerCase()
  const done = () => {
    const clean = cleanName(name)
    if (!clean) return setError(true)
    onDone(clean)
  }
  return (
    <div className="den-below hello">
      <h2 ref={headingRef} tabIndex={-1}>
        Say hello to your {word}!
      </h2>
      {pet.shiny && <p className="hello-shiny">✨ A shiny one!</p>}
      <div ref={field}>
        <NameField
          id="hello-name"
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
            setName(suggestedName(pet.species, pet.id, next))
            setError(false)
            requestAnimationFrame(() => field.current?.querySelector('input')?.select())
          }}
        >
          <span aria-hidden>🎲</span> Another name
        </button>
        <button type="button" className="btn primary" onClick={done}>
          That's the one!
        </button>
      </div>
    </div>
  )
}

// ---- the creature card --------------------------------------------------------------------

function CreatureCard({
  pet,
  balance,
  nameRef,
  onRename,
  onFeed,
}: {
  pet: Pet
  balance: number
  nameRef: React.RefObject<HTMLHeadingElement | null>
  onRename: (name: string) => void
  onFeed: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const renameBtn = useRef<HTMLButtonElement>(null)
  const refocus = useRef(false)
  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false
      renameBtn.current?.focus()
    }
  }, [editing])
  const close = () => {
    refocus.current = true
    setEditing(false)
    setError(false)
  }
  const save = () => {
    const clean = cleanName(draft)
    if (!clean) return setError(true)
    if (clean !== pet.name) onRename(clean)
    close()
  }
  const mood = moodLine(pet.name, pet.mood)
  return (
    <section className="dash-card creature-card" aria-labelledby="creature-name">
      {editing ? (
        <div className="creature-rename">
          <NameField id="rename-name" value={draft} error={error} onChange={(v) => {
            setDraft(v)
            if (error && v.trim()) setError(false)
          }} onEnter={save} onEscape={close} />
          <div className="chips">
            <button type="button" className="btn primary" onClick={save}>
              Save
            </button>
            <button type="button" className="btn" onClick={close}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="creature-name-row">
          <h2 id="creature-name" ref={nameRef} tabIndex={-1}>
            {displayName(pet)}
          </h2>
          <button
            ref={renameBtn}
            type="button"
            className="btn small"
            aria-label={`Rename ${pet.name}`}
            onClick={() => {
              setDraft(pet.name)
              setEditing(true)
            }}
          >
            <span aria-hidden>✏️</span> Rename
          </button>
        </div>
      )}
      <p className="creature-level">
        <span>{levelLine(pet)}</span> <span className="muted">{speciesById(pet.species).name}</span>
      </p>
      <GrowthBar pet={pet} numbers />
      <p className="creature-next">{nextLine(pet)}</p>
      {mood && <p className="creature-mood">{mood}</p>}
      <div className="food-bowl">
        <CookiePill n={balance} />
        <FeedButton name={pet.name} balance={balance} onFeed={onFeed} />
      </div>
    </section>
  )
}

// ---- this week ----------------------------------------------------------------------------

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export function dayLabel(day: string, today: string): string {
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  return DAY_FORMAT.format(new Date(`${day}T00:00:00Z`)).replace(',', '')
}

function WeekCard({ c, phone }: { c: Creatures; phone: boolean }) {
  const details = useRef<HTMLDetailsElement>(null)
  // open on a computer, closed on a phone
  useEffect(() => {
    if (details.current) details.current.open = !phone
  }, [phone])
  const { lines, total } = c.week
  return (
    <details className="dash-card week-card" ref={details}>
      <summary>
        <h2>This week · {lines.length ? `+${total} 🍪` : 'nothing yet'}</h2>
      </summary>
      {lines.length > 0 && (
        <ul className="week-list">
          {lines.map((l) => (
            <WeekRow key={l.day} line={l} today={c.today} />
          ))}
        </ul>
      )}
    </details>
  )
}

function WeekRow({ line, today }: { line: WeekLine; today: string }) {
  // each part wraps as a whole ("🌙 30 min" never splits); only a long book title may wrap inside
  const parts: React.ReactNode[] = []
  if (Math.round(line.minutes) > 0) parts.push(<span className="week-part">{minutesText(line.minutes)}</span>)
  if (Math.round(line.sleepMinutes) > 0) parts.push(<span className="week-part">🌙 {minutesText(line.sleepMinutes)}</span>)
  line.finished.forEach((b) =>
    parts.push(
      <span className="week-part">
        📗 <span className="week-title">{b.title}</span>
      </span>,
    ),
  )
  return (
    <li>
      <span className="week-day">{dayLabel(line.day, today)}</span>
      <span className="week-what">
        {parts.map((part, i) => (
          <Fragment key={i}>
            {i > 0 && ' · '}
            {part}
          </Fragment>
        ))}
      </span>
      <span className="week-cookies">+{line.cookies} 🍪</span>
    </li>
  )
}
