import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { speciesById } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import { cleanName, isShinyEgg, suggestedName } from '#/lib/creatures/creature'
import type { Creatures, Pet } from '#/lib/creatures/creature'
import { minutesText } from '#/lib/creatures/cookies'
import type { WeekLine } from '#/lib/creatures/cookies'
import { addDays } from '#/lib/creatures/days'
import { CHOICE_LABEL, CURRENT_SAVE_MS, SPECIES_WORD, WELCOME_CHOICES, WELCOME_EGG } from '#/lib/creatures/numbers'
import {
  EGG_DESCRIPTION,
  currentSay,
  denDescription,
  displayName,
  eggOnCushion,
  hatchSay,
  levelLine,
  moodLine,
  nextLine,
} from '#/lib/creatures/words'
import { useCreatures } from './creatures/CreaturesContext'
import { CookiePill, FeedButton, GrowthBar, NameField, useSay } from './creatures/parts'
import { usePhone, useReducedMotion, webglAvailable } from './creatures/pose'
import { DenScene } from './creatures/DenScene'
import type { DenShows, Reaction } from './creatures/DenScene'
import { ChooseScene } from './creatures/ChooseScene'
import type { Tile } from './creatures/ChooseScene'
import { SceneBoundary } from './creatures/SceneBoundary'
import { EggsCard } from './creatures/EggsCard'
import { PetsCard } from './creatures/PetsCard'
import { Album } from './creatures/Album'
import { Reveal } from './creatures/Reveal'
import type { RevealOf } from './creatures/Reveal'
import { HoldButton, ShinyWarning } from './creatures/bits'
import { DenStrip, DressStrip, ShopCard, ViewSwitch } from './creatures/Shop'
import type { ShopActions } from './creatures/Shop'
import { decorShownSay } from './creatures/CreaturesContext'
import { shopItem } from '#/lib/creatures/shop'
import type { DenSlot, OutfitSlot, RoomDecorId, ShopCategory } from '#/lib/creatures/shop'
import { denShopDescription } from '#/lib/creatures/words'
import { weatherAt } from '#/lib/creatures/weather'
import type { Room } from '#/lib/room'
import { toggleDecor } from '#/lib/room'

/**
 * The Creatures tab (T-0029 Design §2–§7, §10, §12; T-0030 Design §2–§9): her
 * current pet in its den with its name, level, stage and the cookie balance,
 * Feed, Rename and Release; the Eggs card with milestone eggs to hatch; Your
 * pets to pick the current one; *This week*; and the album. Before the first
 * hatch it holds the welcome flow: the egg, *Choose your first creature*, the
 * crack and *Say hello* (in the tab, never a pop-up).
 */

interface Props {
  books: Book[]
  /** a Hatch button elsewhere (Waiting for you, the block) opened the tab: go straight to choosing */
  startChoose?: boolean
  /** the choose step has been opened from `startChoose` (so a reload doesn't open it again) */
  onChooseOpened?: () => void
  /** a Hatch or Choose button elsewhere opened the tab: hatch the oldest egg, or open the waiting duplicate */
  startStep?: 'hatch' | 'duplicate'
  /** that step has been started (so a reload doesn't start it again) */
  onStepOpened?: () => void
  /** something is over the page (the book panel, a sheet): the den stops rendering */
  paused?: boolean
  /** the Shop view's category from the URL (`&shop=`), or none for the Den view (T-0031) */
  shop?: ShopCategory | null
  /** switching views pushes a history entry (Back returns); changing category replaces it */
  onShop?: (category: ShopCategory | null, opts?: { replace?: boolean }) => void
  /** her room on this device: a bought decoration is shown or hidden there (T-0031 §11) */
  room?: Room
  onRoom?: (room: Room) => void
}

type Step = 'egg' | 'choose' | 'crack' | 'hello' | 'home'

export function CreaturesPage({ books, startChoose, onChooseOpened, startStep, onStepOpened, paused, shop: shopProp, onShop, room, onRoom }: Props) {
  const { c, api, feed, choose, release, setCurrent, now, buy, wear, place, setHabitat } = useCreatures(books)
  // the view: from the URL when the page is routed, else kept here (a test)
  const [ownShop, setOwnShop] = useState<ShopCategory | null>(shopProp ?? null)
  const shopCat = onShop ? (shopProp ?? null) : ownShop
  const goShop = (cat: ShopCategory | null, opts?: { replace?: boolean }) => (onShop ? onShop(cat, opts) : setOwnShop(cat))
  /** the pet being dressed in Outfits (Dress up or the Dress row); the current pet otherwise */
  const [dressId, setDressId] = useState<string | null>(null)
  const [hatchNext, setHatchNext] = useState(false)
  const shopHeading = useRef<HTMLHeadingElement>(null)
  const stripHeading = useRef<HTMLHeadingElement>(null)
  const focusShop = useRef<'heading' | 'strip' | null>(null)
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const [said, say] = useSay()
  const [stepState, setStep] = useState<Step>(() => (startChoose ? 'choose' : 'egg'))
  const [reaction, setReaction] = useState<Reaction | null>(null)
  /** a milestone egg hatching (`crack`) or its reveal below the den */
  const [reveal, setReveal] = useState<{ egg: string; phase: 'crack' | 'reveal'; said: boolean } | null>(null)
  /** the pet she just picked in Your pets, shown at once; saved after she stops arrowing */
  const [picked, setPicked] = useState<string | null>(null)
  const pickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hatchBtn = useRef<HTMLButtonElement>(null)
  const chooseHeading = useRef<HTMLHeadingElement>(null)
  const helloHeading = useRef<HTMLHeadingElement>(null)
  const nameHeading = useRef<HTMLHeadingElement>(null)
  const eggsHeading = useRef<HTMLHeadingElement>(null)
  const revealHeading = useRef<HTMLHeadingElement>(null)
  const denCard = useRef<HTMLElement>(null)
  /** where focus goes after the next render */
  const focusNext = useRef<'choose' | 'hatch' | 'hello' | 'name' | 'eggs' | 'reveal' | null>(startChoose ? 'choose' : null)

  const pet = c.pets.find((p) => p.id === picked) ?? c.pet
  const step: Step = c.pet ? (stepState === 'crack' || stepState === 'hello' ? stepState : 'home') : stepState === 'choose' ? 'choose' : 'egg'

  useEffect(() => {
    if (startChoose) onChooseOpened?.()
  }, [startChoose, onChooseOpened])

  useLayoutEffect(() => {
    const s = focusShop.current
    const sel = s === 'heading' ? shopHeading.current : s === 'strip' ? stripHeading.current : null
    if (sel) {
      sel.focus()
      focusShop.current = null
    }
    const f = focusNext.current
    if (!f) return
    const el = { choose: chooseHeading, hatch: hatchBtn, hello: helloHeading, name: nameHeading, eggs: eggsHeading, reveal: revealHeading }[f].current
    if (el) {
      el.focus()
      focusNext.current = null
    }
  })

  // the picked pet is saved: follow the saved one again
  useEffect(() => {
    if (picked && c.pet?.id === picked && !pickTimer.current) setPicked(null)
  }, [picked, c.pet])
  // a pick not saved yet is saved when she leaves: another tab, a reload, the app put away
  const pending = useRef<string | null>(null)
  const saveCurrent = useRef(setCurrent)
  saveCurrent.current = setCurrent
  const flushPick = useCallback(() => {
    if (pickTimer.current) clearTimeout(pickTimer.current)
    pickTimer.current = null
    const id = pending.current
    pending.current = null
    if (id) saveCurrent.current(id)
  }, [])
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushPick()
    }
    window.addEventListener('pagehide', flushPick)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', flushPick)
      document.removeEventListener('visibilitychange', onHidden)
      flushPick()
    }
  }, [flushPick])

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

  // ---- milestone eggs (T-0030 Design §3) ----

  /** Hatch always hatches the oldest egg; the choice is saved on the tap, before the crack. */
  const hatchOldest = useCallback(() => {
    const egg = c.eggs[0]
    if (!egg || !c.pet || reveal) return
    api.choices.hatchEgg(egg.id)
    focusNext.current = gl && !reduce ? null : 'reveal'
    setReveal({ egg: egg.id, phase: gl ? 'crack' : 'reveal', said: false })
    denCard.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [api, c.eggs, c.pet, gl, reduce, reveal])

  const openDuplicate = useCallback((egg: string) => {
    focusNext.current = 'reveal'
    setReveal({ egg, phase: 'reveal', said: true })
    denCard.current?.scrollIntoView?.({ block: 'start' })
  }, [])

  // a Hatch or Choose button elsewhere opened the tab
  const started = useRef(false)
  useEffect(() => {
    if (!startStep || started.current || !c.pet) return
    started.current = true
    if (startStep === 'hatch') hatchOldest()
    else if (c.waiting[0]) openDuplicate(c.waiting[0].egg)
    onStepOpened?.()
  }, [startStep, c.pet, c.waiting, hatchOldest, openDuplicate, onStepOpened])

  // what the egg being revealed hatched: worked out from the log, like everything else
  const revealOf: RevealOf | null = (() => {
    if (!reveal) return null
    const d = c.duplicates.find((x) => x.egg === reveal.egg)
    const p = c.pets.find((x) => x.id === reveal.egg)
    const tier = d?.tier ?? p?.tier
    const species = d?.species ?? p?.species
    if (!tier || !species) return null
    return { egg: reveal.egg, tier, species, shiny: d?.shiny ?? p!.shiny, duplicate: !!d }
  })()

  useEffect(() => {
    if (!reveal || reveal.said || !revealOf) return
    say(hatchSay(revealOf.tier, revealOf.species, revealOf.shiny, !revealOf.duplicate))
    setReveal({ ...reveal, said: true })
  }, [reveal, revealOf, say])

  const endReveal = (text?: string) => {
    if (text) say(text)
    focusNext.current = 'eggs'
    setReveal(null)
  }

  const pick = (p: Pet) => {
    setPicked(p.id)
    say(currentSay(p.name))
    if (pickTimer.current) clearTimeout(pickTimer.current)
    pending.current = p.id
    // arrowing through six pets writes one event, not six (Design §8)
    pickTimer.current = setTimeout(flushPick, CURRENT_SAVE_MS)
  }

  // the egg line's Hatch in the shop: to the Den view, then hatch the oldest egg there
  useEffect(() => {
    if (!hatchNext || shopCat) return
    setHatchNext(false)
    hatchOldest()
  }, [hatchNext, shopCat, hatchOldest])

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

  const hatching = reveal && revealOf
  const shows: DenShows =
    step === 'crack' && c.pet
      ? { kind: 'crack', species: c.pet.species, shiny: c.pet.shiny }
      : hatching && reveal.phase === 'crack'
        ? { kind: 'crack', species: revealOf.species, shiny: revealOf.shiny, tier: revealOf.tier }
        : hatching
          ? { kind: 'creature', species: revealOf.species, shiny: revealOf.shiny, stage: 'baby', mood: null }
          : pet
            ? { kind: 'creature', species: pet.species, shiny: pet.shiny, stage: pet.stage, mood: pet.mood }
            : { kind: 'egg' }
  const home = !!pet && step === 'home'
  // the Shop view, from the first pet on (before the welcome hatch `&shop=` shows the Den view)
  const shopView = home && !!shopCat && !reveal
  const dressed = (shopCat === 'outfits' && c.pets.find((p) => p.id === dressId)) || pet
  const denPet = shopView && dressed ? dressed : pet
  const den = { habitat: c.shop.habitat, placed: c.shop.placed }
  const dressOf = (p: Pet | null | undefined) => (p ? (c.shop.worn.get(p.id) ?? {}) : {})
  const shopDenText = denPet
    ? denShopDescription(
        denPet,
        (['head', 'face', 'neck', 'back'] as const).flatMap((s) => (dressOf(denPet)[s] ? [shopItem(dressOf(denPet)[s]!)!] : [])),
        c.shop.placed.bed ? shopItem(c.shop.placed.bed)! : null,
        c.shop.habitat === 'cosy' ? null : shopItem(c.shop.habitat)!,
        (['wall', 'left', 'right', 'toy', 'rug'] as const).flatMap((s) => (c.shop.placed[s] ? [shopItem(c.shop.placed[s]!)!] : [])),
        weatherAt(now),
      )
    : null
  const denText = hatching ? (reveal.phase === 'crack' ? eggOnCushion(revealOf.tier) : `${SPECIES_WORD[revealOf.species]}, a baby, sitting on its cushion in the den.`) : pet ? (shopDenText ?? denDescription(pet)) : EGG_DESCRIPTION
  const samePets = revealOf ? c.pets.filter((p) => p.species === revealOf.species && p.id !== revealOf.egg) : []
  const newPet = revealOf ? c.pets.find((p) => p.id === revealOf.egg) : undefined

  const denCanvas = (
    <SceneBoundary onFail={() => setGl(false)}>
      <DenScene
        shows={shopView && denPet ? { kind: 'creature', species: denPet.species, shiny: denPet.shiny, stage: denPet.stage, mood: denPet.mood } : shows}
        cookies={c.balance}
        phone={phone}
        reduce={reduce}
        paused={paused}
        reaction={reaction}
        dress={hatching ? undefined : dressOf(denPet)}
        den={den}
        now={now}
        onCrackDone={() => {
          if (reveal?.phase === 'crack') {
            focusNext.current = 'reveal'
            setReveal({ ...reveal, phase: 'reveal' })
          } else go('hello', 'hello')
        }}
      />
    </SceneBoundary>
  )
  // a new habitat cross-fades in (300 ms; at once with reduce motion, by CSS)
  const habitatFade = <span key={c.shop.habitat} className="den-fade" aria-hidden />

  const shopActions: ShopActions = {
    buy: (id) => {
      const it = shopItem(id)
      if (!it || !pet) return { ok: false }
      const r = buy(id, it.category === 'food' ? { pet: pet.id } : {})
      if (r.say) say(r.say)
      if (r.ok && it.category === 'food') setReaction((prev) => ({ kind: r.levelUp ? 'levelup' : 'feed', n: (prev?.n ?? 0) + 1 }))
      return r
    },
    wear: (slot, id) => {
      if (!dressed) return
      const r = wear(dressed.id, slot, id)
      if (r.ok && r.say) say(r.say)
    },
    place: (slot, id) => {
      const r = place(slot, id)
      if (r.ok && r.say) say(r.say)
    },
    habitat: (id) => {
      const r = setHabitat(id)
      if (r.ok) say(r.say)
    },
    decor: (id, on) => {
      const d = room?.decor.find((x) => x.kind === id)
      if (room && onRoom && d && d.on !== on) onRoom(toggleDecor(room, id as RoomDecorId))
      say(decorShownSay(id, on))
    },
    hatch: () => {
      goShop(null)
      setHatchNext(true)
    },
  }
  const decorOn = (id: string) => (room ? !!room.decor.find((d) => d.kind === id)?.on : c.shop.owned.has(id))
  const openShop = (cat: ShopCategory, dressPet?: string) => {
    setDressId(dressPet ?? null)
    focusShop.current = 'heading'
    goShop(cat)
  }

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
        {home && (
          <ViewSwitch
            shop={shopView}
            category={shopCat ?? 'food'}
            onView={(toShop) => {
              setDressId(null)
              goShop(toShop ? (shopCat ?? 'food') : null)
            }}
          />
        )}
        {shopView && pet && dressed && (
          <div className="shop-layout">
            <section className={`dash-card den-card shop-den${gl ? '' : ' no-gl'}`} aria-label="The den">
              {gl && (
                <div className="den-stage shop-stage">
                  {denCanvas}
                  {habitatFade}
                  <p className="visually-hidden">{shopDenText}</p>
                </div>
              )}
              {shopCat === 'outfits' && (
                <DressStrip
                  pets={c.pets}
                  dressed={dressed}
                  worn={dressOf(dressed)}
                  headingRef={stripHeading}
                  onDress={(p) => setDressId(p.id)}
                  onTakeOff={(slot: OutfitSlot) => {
                    focusShop.current = 'strip'
                    shopActions.wear(slot, 'none')
                  }}
                />
              )}
              {(shopCat === 'home' || shopCat === 'toys') && (
                <DenStrip
                  placed={c.shop.placed}
                  headingRef={stripHeading}
                  onPutAway={(slot: DenSlot) => {
                    focusShop.current = 'strip'
                    shopActions.place(slot, 'none')
                  }}
                />
              )}
            </section>
            <ShopCard
              c={c}
              category={shopCat!}
              onCategory={(cat) => {
                if (cat !== 'outfits') setDressId(null)
                goShop(cat, { replace: true })
              }}
              dressPet={dressed}
              current={pet}
              decorOn={decorOn}
              actions={shopActions}
              headingRef={shopHeading}
            />
          </div>
        )}
        {!shopView && (
        <div className={`creatures-layout${home ? '' : ' no-card'}`}>
          <section ref={denCard} className="dash-card den-card" aria-label={step === 'choose' ? undefined : 'The den'}>
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
                    {denCanvas}
                    {habitatFade}
                    <p className="visually-hidden">{denText}</p>
                  </div>
                )}
                {home && !reveal && (
                  <div className="den-actions">
                    <button type="button" className="btn small" onClick={() => openShop('home')}>
                      <span aria-hidden>🛋️</span> Arrange
                    </button>
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
                {step === 'hello' && c.pet && (
                  <HelloStep
                    pet={c.pet}
                    headingRef={helloHeading}
                    onDone={(name) => {
                      if (name !== c.pet!.suggested) api.choices.rename(c.pet!.id, name)
                      go('home', 'name')
                    }}
                  />
                )}
                {home && hatching && reveal.phase === 'reveal' && (
                  <Reveal
                    key={revealOf.egg}
                    of={revealOf}
                    headingRef={revealHeading}
                    samePets={samePets}
                    suggested={newPet?.suggested ?? suggestedName(revealOf.species, revealOf.egg)}
                    onNamed={(name) => {
                      const p = c.pets.find((x) => x.id === revealOf.egg)
                      if (p && name !== p.name) api.choices.rename(p.id, name)
                      endReveal()
                    }}
                    onChoose={(choice, opts) => {
                      const r = choose(revealOf.egg, choice, opts)
                      if (!r.ok) return false
                      if (choice !== 'keep') endReveal(r.say)
                      return true
                    }}
                  />
                )}
              </>
            )}
          </section>
          <div className="creatures-side">
            {home && (
              <EggsCard c={c} headingRef={eggsHeading} busy={!!reveal} onHatch={hatchOldest} onChoose={openDuplicate} />
            )}
            {home && pet && (
              <CreatureCard
                pet={pet}
                balance={c.balance}
                canRelease={c.pets.length > 1}
                nameRef={nameHeading}
                onDressUp={() => openShop('outfits', pet.id)}
                onRename={(name) => {
                  api.choices.rename(pet.id, name)
                  say(`Renamed to ${name}.`)
                }}
                onFeed={() => {
                  const r = feed(pet.id)
                  if (!r) return
                  say(r.say)
                  setReaction((prev) => ({ kind: r.levelUp ? 'levelup' : 'feed', n: (prev?.n ?? 0) + 1 }))
                }}
                onRelease={(held) => {
                  flushPick()
                  const r = release(pet.id, { confirmed: true, held })
                  if (!r.ok) return false
                  setPicked(null)
                  say(r.say)
                  focusNext.current = 'name'
                  return true
                }}
              />
            )}
            {home && c.pets.length >= 2 && <PetsCard pets={c.pets} current={pet?.id ?? null} onPick={pick} />}
            <WeekCard c={c} phone={phone} />
          </div>
        </div>
        )}
        {home && !shopView && <Album c={c} />}
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
            // re-select only when she is in the field: 🎲 never pulls focus away from itself
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
    </div>
  )
}

// ---- the creature card --------------------------------------------------------------------

function CreatureCard({
  pet,
  balance,
  canRelease,
  nameRef,
  onRename,
  onFeed,
  onRelease,
  onDressUp,
}: {
  pet: Pet
  balance: number
  /** 👗 Dress up: the Shop view's Outfits, dressing this pet (T-0031 §3) */
  onDressUp?: () => void
  /** false for her last pet: Release… is shown but disabled (D-0033 §9) */
  canRelease: boolean
  nameRef: React.RefObject<HTMLHeadingElement | null>
  onRename: (name: string) => void
  onFeed: () => void
  /** a confirmed release (held for a shiny); answers whether it was done */
  onRelease: (held: boolean) => boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const renameBtn = useRef<HTMLButtonElement>(null)
  const releaseBtn = useRef<HTMLButtonElement>(null)
  const confirmHeading = useRef<HTMLHeadingElement>(null)
  const refocus = useRef<'rename' | 'release' | 'confirm' | null>(null)
  useEffect(() => {
    const f = refocus.current
    if (!f) return
    if (f === 'rename' && !editing) renameBtn.current?.focus()
    if (f === 'release' && !confirming) releaseBtn.current?.focus()
    if (f === 'confirm' && confirming) confirmHeading.current?.focus()
    refocus.current = null
  }, [editing, confirming])
  // another pet became current: no confirm left open for it
  useEffect(() => setConfirming(false), [pet.id])
  const close = () => {
    refocus.current = 'rename'
    setEditing(false)
    setError(false)
  }
  const save = () => {
    const clean = cleanName(draft)
    if (!clean) return setError(true)
    if (clean !== pet.name) onRename(clean)
    close()
  }
  const keep = () => {
    refocus.current = 'release'
    setConfirming(false)
  }
  const mood = moodLine(pet.name, pet.mood)
  return (
    <section className="dash-card creature-card" aria-labelledby="creature-name">
      {editing ? (
        <div className="creature-rename">
          <NameField id="rename-name" focusOnMount value={draft} error={error} onChange={(v) => {
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
          {onDressUp && (
            <button type="button" className="btn small" onClick={onDressUp}>
              <span aria-hidden>👗</span> Dress up
            </button>
          )}
        </div>
      )}
      <p className="creature-level">
        <span>{levelLine(pet)}</span> <span className="muted">{speciesById(pet.species).name}</span>
      </p>
      <GrowthBar pet={pet} numbers />
      <p className="creature-next">{nextLine(pet)}</p>
      {mood && <p className="creature-mood">{mood}</p>}
      {confirming ? (
        <div
          className="release-confirm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              keep()
            }
          }}
        >
          <h3 ref={confirmHeading} tabIndex={-1}>
            Release {pet.name}?
          </h3>
          {pet.shiny ? <ShinyWarning id="release-warning" line="This can't be undone." /> : <p>This can't be undone.</p>}
          <div className="chips">
            <button type="button" className="btn primary" onClick={keep}>
              Keep
            </button>
            {pet.shiny ? (
              <HoldButton label="Hold to release" ariaLabel={`Hold to release ${pet.name}`} describedBy="release-warning" onDone={() => onRelease(true)} />
            ) : (
              <button type="button" className="btn danger-btn" onClick={() => onRelease(false)}>
                Release
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="food-bowl">
            <CookiePill n={balance} />
            <FeedButton name={pet.name} balance={balance} onFeed={onFeed} />
          </div>
          <div className="release-row">
            <button
              ref={releaseBtn}
              type="button"
              className="btn small release-btn"
              aria-disabled={!canRelease || undefined}
              aria-describedby={canRelease ? undefined : 'release-last'}
              title={canRelease ? undefined : 'You always keep one pet.'}
              onClick={() => {
                if (!canRelease) return
                refocus.current = 'confirm'
                setConfirming(true)
              }}
            >
              Release…
            </button>
            {!canRelease && (
              <span id="release-last" className="visually-hidden">
                You always keep one pet.
              </span>
            )}
          </div>
        </>
      )}
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
