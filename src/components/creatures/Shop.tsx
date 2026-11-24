import { useLayoutEffect, useRef, useState } from 'react'
import type { Creatures, Pet } from '#/lib/creatures/creature'
import { FOOD_GROWTH } from '#/lib/creatures/numbers'
import { CATEGORIES, COSY, DEN_SLOTS, OUTFIT_SLOTS, SLOT_WORD, itemsIn, priceOf, shopItem, theItem } from '#/lib/creatures/shop'
import type { DenSlot, OutfitSlot, ShopCategory, ShopItem } from '#/lib/creatures/shop'
import { cookieNumber, eggName } from '#/lib/creatures/words'
import { Still, TierLine } from './bits'
import { HABITAT_STILL, creatureStill, eggStill, shopStill } from './stillPaths'

/**
 * The creature shop (T-0031 Design §3–§9, §12–§14): the Den | Shop switch, the
 * shop card with its seven category chips and item cards in four states with
 * the inline buy confirm (never a pop-up, D-0013), and the strips under the den:
 * "Biscuit is wearing" (with the Dress row) and "In the den".
 */

// ---- the Den | Shop switch -----------------------------------------------------------------

export function ViewSwitch({ shop, category, onView }: { shop: boolean; category: ShopCategory; onView: (shop: boolean) => void }) {
  const link = (toShop: boolean, href: string, emoji: string, text: string) => (
    <a
      href={href}
      className={`view-switch-link${toShop === shop ? ' active' : ''}`}
      aria-current={toShop === shop ? 'page' : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        if (toShop !== shop) onView(toShop)
      }}
    >
      <span aria-hidden>{emoji}</span> {text}
    </a>
  )
  return (
    <nav className="view-switch" aria-label="Creatures">
      {link(false, '?view=creatures', '🏡', 'Den')}
      {link(true, `?view=creatures&shop=${category}`, '🛍️', 'Shop')}
    </nav>
  )
}

// ---- the shop card -------------------------------------------------------------------------

export interface ShopActions {
  /** buy (food: give to the current pet); answers what to say, whether it was done */
  buy: (id: string) => { ok: boolean; say?: string }
  /** put on (`id`) or take off (`none`) for the dressed pet */
  wear: (slot: OutfitSlot, id: string | 'none') => void
  place: (slot: DenSlot, id: string | 'none') => void
  habitat: (id: string) => void
  /** show or hide a bought decoration in the room on this device */
  decor: (id: string, on: boolean) => void
  /** the egg line's Hatch: to the Den view, hatching the oldest egg */
  hatch: () => void
}

type State = 'afford' | 'poor' | 'owned' | 'inuse'

interface Props {
  c: Creatures
  category: ShopCategory
  onCategory: (c: ShopCategory) => void
  /** whose outfits the cards are about: the dressed pet */
  dressPet: Pet
  /** who gets food: the current pet */
  current: Pet
  /** decorations switched on in the room on this device */
  decorOn: (id: string) => boolean
  actions: ShopActions
  headingRef: React.RefObject<HTMLHeadingElement | null>
}

const IN_USE_CHIP: Partial<Record<ShopCategory, string>> = {
  outfits: '✓ Wearing',
  home: '✓ In the den',
  toys: '✓ In the den',
  habitats: '✓ Your habitat',
  room: '✓ In the room',
}

export function ShopCard({ c, category, onCategory, dressPet, current, decorOn, actions, headingRef }: Props) {
  const cat = CATEGORIES.find((x) => x.id === category)!
  const [confirm, setConfirm] = useState<string | null>(null)
  /** where focus goes after the next render: a card's action, its Buy, or its confirm question */
  const focusNext = useRef<{ id: string; what: 'action' | 'question' } | null>(null)
  const actionRefs = useRef(new Map<string, HTMLElement | null>())
  const questionRefs = useRef(new Map<string, HTMLElement | null>())
  /** the item whose confirm Buy was tapped: a second tap before the re-render does nothing */
  const buying = useRef<string | null>(null)
  const chips = useRef<Array<HTMLButtonElement | null>>([])

  useLayoutEffect(() => {
    buying.current = null
    const f = focusNext.current
    if (!f) return
    const el = (f.what === 'action' ? actionRefs : questionRefs).current.get(f.id)
    if (el) {
      el.focus()
      focusNext.current = null
    }
  })

  const worn = c.shop.worn.get(dressPet.id) ?? {}
  const stateOf = (i: ShopItem): State => {
    const price = priceOf(i.id)
    const owned = i.id === COSY.id || c.shop.owned.has(i.id)
    if (i.category === 'food' || i.category === 'eggs' || !owned) return c.balance >= price && c.balance > 0 ? 'afford' : 'poor'
    const inUse =
      i.category === 'outfits'
        ? worn[i.slot as OutfitSlot] === i.id
        : i.category === 'home' || i.category === 'toys'
          ? c.shop.placed[i.slot as DenSlot] === i.id
          : i.category === 'habitats'
            ? c.shop.habitat === i.id
            : decorOn(i.id)
    return inUse ? 'inuse' : 'owned'
  }

  const pickChip = (i: number) => {
    const next = CATEGORIES[(i + CATEGORIES.length) % CATEGORIES.length]
    setConfirm(null)
    onCategory(next.id)
    chips.current[(i + CATEGORIES.length) % CATEGORIES.length]?.focus()
  }

  return (
    <section className="dash-card shop-card" aria-label="Shop">
      <div
        className="chips shop-chips"
        role="tablist"
        aria-label="Shop"
        onKeyDown={(e) => {
          const i = CATEGORIES.findIndex((x) => x.id === category)
          const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: CATEGORIES.length - 1 }[e.key]
          if (to === undefined) return
          e.preventDefault()
          pickChip(to)
        }}
      >
        {CATEGORIES.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => {
              chips.current[i] = el
            }}
            type="button"
            role="tab"
            id={`shop-tab-${x.id}`}
            aria-selected={x.id === category}
            aria-controls="shop-panel"
            tabIndex={x.id === category ? 0 : -1}
            className={`shop-chip${x.id === category ? ' active' : ''}`}
            onClick={() => {
              setConfirm(null)
              onCategory(x.id)
            }}
          >
            <span aria-hidden>{x.emoji}</span> {x.chip}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="shop-panel" aria-labelledby="shop-heading">
        <h2 id="shop-heading" ref={headingRef} tabIndex={-1}>
          {cat.heading}
        </h2>
        {/* only the open category is rendered, so only its pictures load (Design §10) */}
        <ul className={`shop-grid${category === 'habitats' ? ' wide' : ''}`}>
          {itemsIn(category).map((i) => (
            <ItemCard
              key={i.id}
              item={i}
              state={stateOf(i)}
              balance={c.balance}
              dressPet={dressPet}
              current={current}
              eggWaiting={i.category === 'eggs' && c.eggs.some((e) => e.kind === 'shop' && e.tier === i.tier)}
              confirming={confirm === i.id}
              actionRef={(el) => actionRefs.current.set(i.id, el)}
              questionRef={(el) => questionRefs.current.set(i.id, el)}
              onBuy={() => {
                if (i.category === 'food') {
                  actions.buy(i.id)
                  return
                }
                focusNext.current = { id: i.id, what: 'question' }
                setConfirm(i.id)
              }}
              onCancel={() => {
                focusNext.current = { id: i.id, what: 'action' }
                setConfirm(null)
              }}
              onConfirm={() => {
                if (buying.current) return
                buying.current = i.id
                actions.buy(i.id)
                focusNext.current = { id: i.id, what: 'action' }
                setConfirm(null)
              }}
              onUse={(on) => {
                focusNext.current = { id: i.id, what: 'action' }
                if (i.category === 'outfits') actions.wear(i.slot as OutfitSlot, on ? i.id : 'none')
                else if (i.category === 'home' || i.category === 'toys') actions.place(i.slot as DenSlot, on ? i.id : 'none')
                else if (i.category === 'habitats') actions.habitat(i.id)
                else actions.decor(i.id, on)
              }}
              onHatch={actions.hatch}
            />
          ))}
        </ul>
      </div>
    </section>
  )
}

// ---- one card --------------------------------------------------------------------------------

function ItemCard({
  item,
  state,
  balance,
  dressPet,
  current,
  eggWaiting,
  confirming,
  actionRef,
  questionRef,
  onBuy,
  onCancel,
  onConfirm,
  onUse,
  onHatch,
}: {
  item: ShopItem
  state: State
  balance: number
  dressPet: Pet
  current: Pet
  eggWaiting: boolean
  confirming: boolean
  actionRef: (el: HTMLElement | null) => void
  questionRef: (el: HTMLElement | null) => void
  onBuy: () => void
  onCancel: () => void
  onConfirm: () => void
  onUse: (on: boolean) => void
  onHatch: () => void
}) {
  const price = priceOf(item.id)
  const missing = price - balance
  const the = theItem(item)
  const egg = item.category === 'eggs' ? eggName(item.tier!) : null
  const what = egg ?? the
  const descId = `shop-more-${item.id}`
  const habitat = item.category === 'habitats'
  const forSale = state === 'afford' || state === 'poor'

  let line: React.ReactNode = null
  if (item.category === 'food') line = `Grows ${current.name} by ${FOOD_GROWTH[item.id] ?? 0}`
  else if (item.category === 'eggs') line = <TierLine tier={item.tier!} />
  else if (item.slot) line = SLOT_WORD[item.slot]

  let action: React.ReactNode = null
  if (forSale) {
    const poor = state === 'poor'
    const food = item.category === 'food'
    action = (
      <button
        ref={actionRef}
        type="button"
        className="btn shop-btn"
        aria-disabled={poor || undefined}
        aria-describedby={poor ? descId : undefined}
        aria-label={food ? `Give ${current.name} ${egg ?? `a ${item.name.toLowerCase()}`} for ${price} cookies` : `Buy ${what} for ${price} cookies`}
        onClick={() => {
          if (!poor) onBuy()
        }}
      >
        {food ? `Give to ${current.name}` : 'Buy'}
      </button>
    )
  } else if (habitat && state === 'inuse') {
    action = (
      <p className="muted small-text shop-now" ref={actionRef as React.Ref<HTMLParagraphElement>} tabIndex={-1}>
        Your habitat now
      </p>
    )
  } else {
    const on = state === 'owned'
    const [text, label] =
      item.category === 'outfits'
        ? on
          ? [`Put on ${dressPet.name}`, `Put ${the} on ${dressPet.name}`]
          : ['Take off', `Take ${the} off ${dressPet.name}`]
        : item.category === 'home' || item.category === 'toys'
          ? on
            ? ['Place in the den', `Place ${the} in the den`]
            : ['Put away', `Put ${the} away`]
          : habitat
            ? ['Use this habitat', `Use ${the} as your habitat`]
            : on
              ? ['Show in the room', `Show ${the} in the room`]
              : ['Hide in the room', `Hide ${the} in the room`]
    action = (
      <button ref={actionRef} type="button" className="btn shop-btn" aria-label={label} onClick={() => onUse(on)}>
        {text}
      </button>
    )
  }

  return (
    <li className={`shop-item${state === 'inuse' ? ' in-use' : ''}`}>
      <div className={`shop-pic${habitat ? ' wide' : ''}`}>
        {item.category === 'eggs' ? (
          <Still src={eggStill(item.tier!)} size={160} />
        ) : habitat ? (
          <HabitatPicture id={item.id} />
        ) : (
          <Still src={shopStill(item.id)} size={160} />
        )}
        {(state === 'owned' || state === 'inuse') && (
          <span className="shop-state">{state === 'inuse' ? IN_USE_CHIP[item.category] : '✓ Owned'}</span>
        )}
      </div>
      <h3 className="shop-name">{item.name}</h3>
      {line && <p className="shop-line">{line}</p>}
      {confirming ? (
        <div
          className="shop-confirm"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
        >
          <p className="shop-question" ref={questionRef} tabIndex={-1}>
            Buy {what} for {price} <span aria-hidden>🍪</span>
            <span className="visually-hidden"> cookies</span>?
          </p>
          <div className="shop-confirm-row">
            <button type="button" className="btn primary" onClick={onConfirm}>
              Buy
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {forSale && (
            <p className="shop-price">
              <span className="price-pill">
                {price} <span aria-hidden>🍪</span>
                <span className="visually-hidden"> cookies</span>
              </span>
              {state === 'poor' && (
                <span className="shop-more" id={descId}>
                  <span aria-hidden>
                    {cookieNumber(missing)} 🍪 more
                  </span>
                  <span className="visually-hidden">{missing} more cookies needed</span>
                </span>
              )}
            </p>
          )}
          {action}
          {eggWaiting && (
            <p className="shop-egg-line small-text">
              <span aria-hidden>🥚</span> Waiting in your eggs ·{' '}
              <a
                href="?view=creatures&step=hatch"
                onClick={(e) => {
                  e.preventDefault()
                  onHatch()
                }}
              >
                Hatch
              </a>
            </p>
          )}
        </>
      )}
    </li>
  )
}

function HabitatPicture({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <span className="still-missing wide" aria-hidden>
        ?
      </span>
    )
  return (
    <img
      className="still-img"
      src={shopStill(id)}
      alt=""
      width={HABITAT_STILL.w}
      height={HABITAT_STILL.h}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}

// ---- the strips under the den ----------------------------------------------------------------

/** "Biscuit is wearing": the Dress row (2 or more pets) and the four slots with Take off. */
export function DressStrip({
  pets,
  dressed,
  worn,
  onDress,
  onTakeOff,
  headingRef,
}: {
  pets: readonly Pet[]
  dressed: Pet
  worn: Partial<Record<OutfitSlot, string>>
  onDress: (pet: Pet) => void
  onTakeOff: (slot: OutfitSlot) => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className="shop-strip">
      {pets.length >= 2 && (
        <div className="dress-row" role="radiogroup" aria-label="Dress">
          {pets.map((p) => (
            <label key={p.id} className={`dress-pet${p.id === dressed.id ? ' picked' : ''}`}>
              <input type="radio" name="dress-pet" className="visually-hidden" checked={p.id === dressed.id} onChange={() => onDress(p)} />
              <Still src={creatureStill(p.species, p.stage, p.shiny)} size={48} />
              <span className="dress-name">{p.name}</span>
            </label>
          ))}
        </div>
      )}
      <h3 ref={headingRef} tabIndex={-1}>
        {dressed.name} is wearing
      </h3>
      <ul className="strip-rows">
        {OUTFIT_SLOTS.map((slot) => {
          const id = worn[slot]
          const it = id ? shopItem(id) : undefined
          return (
            <li key={slot}>
              <span className="muted">{SLOT_WORD[slot]}</span>
              <span className="strip-what">{it ? it.name : 'nothing'}</span>
              {it && (
                <button type="button" className="btn small" aria-label={`Take ${theItem(it)} off ${dressed.name}`} onClick={() => onTakeOff(slot)}>
                  Take off
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const DEFAULT_IN: Partial<Record<DenSlot, string>> = { bed: 'Gold cushion', rug: 'Plum rug' }

/** "In the den": the six spots with Put away. */
export function DenStrip({
  placed,
  onPutAway,
  headingRef,
}: {
  placed: Partial<Record<DenSlot, string>>
  onPutAway: (slot: DenSlot) => void
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  return (
    <div className="shop-strip">
      <h3 ref={headingRef} tabIndex={-1}>
        In the den
      </h3>
      <ul className="strip-rows">
        {DEN_SLOTS.map((slot) => {
          const id = placed[slot]
          const it = id ? shopItem(id) : undefined
          return (
            <li key={slot}>
              <span className="muted">{SLOT_WORD[slot]}</span>
              <span className="strip-what">{it ? it.name : (DEFAULT_IN[slot] ?? 'nothing')}</span>
              {it && (
                <button type="button" className="btn small" aria-label={`Put ${theItem(it)} away`} onClick={() => onPutAway(slot)}>
                  Put away
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
