import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { GARDEN_ITEMS } from '#/lib/garden/numbers'
import type { GardenItemId } from '#/lib/garden/numbers'
import { startYear, yearOf } from '#/lib/garden/garden'
import type { Plant } from '#/lib/garden/garden'
import type { Spot } from '#/lib/garden/spots'
import { SEASON_LABEL } from '#/lib/garden/seasons'
import type { Season } from '#/lib/garden/seasons'
import {
  EMPTY_GARDEN,
  LEFT_SAY,
  countLine,
  emptyYear,
  gardenSentence,
  lockedLine,
  nextLine,
  pickedUpSay,
  plantLabel,
  seasonChip,
} from '#/lib/garden/words'
import { findPlants } from '#/lib/garden/find'
import type { Found } from '#/lib/garden/find'
import { readingSigns, signsFor } from '#/lib/garden/signs'
import { newsLine } from '#/lib/garden/seen'
import { gardenLayout } from '#/lib/garden/view'
import { useSay } from './creatures/parts'
import { usePhone, useReducedMotion, webglAvailable } from './creatures/pose'
import { SceneBoundary } from './creatures/SceneBoundary'
import { GardenFlat } from './garden/GardenFlat'
import { GardenScene } from './garden/GardenScene'
import { SpotLayer } from './garden/SpotLayer'
import { CoverSigns } from './garden/CoverSigns'
import { flatPlace, sceneAspect, sceneColumns, scenePlace } from './garden/gardenView'
import { useGarden } from './garden/useGarden'
import { useSeen } from './garden/useSeen'
import type { PlaceEvent } from '#/lib/garden/tend'

/**
 * The 🌱 Garden tab (T-0061 Design §1–§5, T-0063, T-0064, T-0066): the year's
 * garden drawn flat on a phone and in the cosy 3D on a computer (D-0051), the
 * chips for her reading years, the plants she can move between spots and beds,
 * Tidy and its Undo, finding a book's plant, the signs with the covers of what
 * she has just finished, the garden items she has unlocked by reading, and the
 * season.
 */

interface Props {
  books: Book[]
  /** something is over the page (the book panel, a sheet): the 3D garden stops rendering */
  paused?: boolean
  /** opens a book's panel from its plant (T-0066) */
  onShowBook?: (id: string) => void
}

export function GardenPage({ books, paused, onShowBook }: Props) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const { garden, move, place, takeAway, tidy, apply } = useGarden(books, { phone })
  const [said, say] = useSay()
  const [year, setYear] = useState<number | null>(null)
  const [pickedId, setPicked] = useState<string | null>(null)
  const [undo, setUndo] = useState<PlaceEvent[] | null>(null)
  const [query, setQuery] = useState('')
  const [foundId, setFound] = useState<string | null>(null)
  // opening the tab is what counts as having looked: the block only reports it
  const seen = useSeen(garden, true)
  const news = seen.plants
  const shown = year !== null && garden.years.some((y) => y.year === year) ? year : startYear(garden)
  const current = yearOf(garden, shown)
  // the flat garden on a phone, and wherever 3D can't be drawn (D-0051 §4)
  const flat = phone || !gl
  const columns = flat ? 1 : sceneColumns(current?.beds ?? 1)
  const layout = useMemo(() => gardenLayout(current?.beds ?? 1, columns), [current?.beds, columns])
  const picked = current?.plants.find((p) => p.id === pickedId) ?? null
  // the books she has just finished, and the one she is reading now on the spot waiting for it
  const signs = useMemo(
    () => (current ? [...signsFor(current, garden.today), ...readingSigns(books, current, garden.today)] : []),
    [books, current, garden.today],
  )
  const hits = useMemo(() => findPlants(garden, query), [garden, query])
  const stage = useRef<HTMLDivElement>(null)

  // a plant picked up in one year garden is put down when she looks at another,
  // and an Undo belongs to the garden it was made in
  useEffect(() => {
    setPicked(null)
    setUndo(null)
  }, [shown])

  if (!garden.years.length || !current) {
    return (
      <div className="dashboard">
        <div className="garden-page">
          <Head garden={garden} year={null} news="" />
          <p className="creatures-empty">{EMPTY_GARDEN}</p>
        </div>
      </div>
    )
  }

  const onDrop = (at: Spot) => {
    if (!picked) return
    const r = move(current, picked.id, at)
    setPicked(null)
    say(r.ok ? r.say : LEFT_SAY)
  }

  const onTidy = () => {
    const r = tidy(current)
    if (r.ok) {
      setUndo(r.undo ?? null)
      setPicked(null)
      setFound(null)
    }
    say(r.ok ? r.say : 'Already in reading order.')
  }

  const onUndo = () => {
    if (!undo) return
    apply(undo)
    setUndo(null)
    say('Put back the way it was.')
  }

  const onFound = (hit: Found) => {
    setYear(hit.year)
    setFound(hit.plant.id)
    setQuery('')
    say(`${hit.plant.book.title} stands in the ${hit.label} garden, bed ${hit.plant.bed + 1}, spot ${hit.plant.spot + 1}.`)
  }

  return (
    <div className="dashboard">
      <div className="garden-page">
        <Head garden={garden} year={current.year} news={newsLine(news)} />
        <Find query={query} onQuery={setQuery} hits={hits} onPick={onFound} />
        {garden.years.length > 1 && (
          <div className="chips garden-years" role="group" aria-label="Reading years">
            {garden.years.map((y) => (
              <button
                key={y.year}
                type="button"
                className={y.year === current.year ? 'btn small active' : 'btn small'}
                aria-current={y.year === current.year ? 'true' : undefined}
                onClick={() => setYear(y.year)}
              >
                {y.label}
              </button>
            ))}
          </div>
        )}
        <section className="dash-card garden-card" aria-label={`${current.label} garden`}>
          {current.plants.length === 0 ? (
            <p className="creatures-empty">{emptyYear(current.label)}</p>
          ) : (
            <>
              <div
                ref={stage}
                className={`garden-stage ${flat ? 'flat' : 'scene'}`}
                style={{ aspectRatio: flat ? `${layout.width} / ${layout.depth}` : `${sceneAspect(layout)}` }}
              >
                {flat ? (
                  <GardenFlat year={current} season={garden.season} columns={1} reduce={reduce} picked={pickedId} found={foundId} />
                ) : (
                  <SceneBoundary onFail={() => setGl(false)}>
                    <GardenScene year={current} season={garden.season} reduce={reduce} paused={paused} />
                  </SceneBoundary>
                )}
                <CoverSigns signs={signs} place={(bed, spot) => (flat ? flatPlace(layout, bed, spot) : scenePlace(layout, bed, spot))} />
                <SpotLayer
                  year={current}
                  place={(bed, spot) => (flat ? flatPlace(layout, bed, spot) : scenePlace(layout, bed, spot))}
                  picked={picked}
                  coarse={phone}
                  news={news}
                  found={foundId}
                  onPick={(p) => {
                    setPicked(p.id)
                    setFound(null)
                    say(pickedUpSay(p))
                  }}
                  onDrop={onDrop}
                  onCancel={() => {
                    setPicked(null)
                    say(LEFT_SAY)
                  }}
                />
              </div>
              <p className="visually-hidden">{gardenSentence(current, garden.season)}</p>
              <div className="garden-tools">
                <p className="garden-counts">{countLine(current)}</p>
                <div className="chips garden-tidy">
                  <button type="button" className="btn small" onClick={onTidy}>
                    Tidy by reading order
                  </button>
                  {undo && (
                    <button type="button" className="btn small" onClick={onUndo}>
                      Undo
                    </button>
                  )}
                </div>
              </div>
              {picked && (
                <PickedPanel
                  plant={picked}
                  onPutBack={() => {
                    setPicked(null)
                    say(LEFT_SAY)
                  }}
                  onShowBook={onShowBook}
                />
              )}
            </>
          )}
        </section>
        <section className="dash-card garden-items-card" aria-labelledby="garden-items-title">
          <h2 id="garden-items-title">Garden items</h2>
          <div className="chips garden-items">
            {GARDEN_ITEMS.map((item) => (
              <ItemButton
                key={item.id}
                id={item.id}
                name={item.name}
                books={item.books}
                season={item.season}
                unlocked={garden.unlocked.includes(item.id)}
                here={garden.available.includes(item.id)}
                placed={current.items.has(item.id)}
                onPlace={() => {
                  const r = place(current.year, item.id)
                  if (r.ok) say(r.say)
                  else if (r.why === 'no-slot') say('Every place in this garden is taken.')
                }}
                onTakeAway={() => {
                  const r = takeAway(current.year, item.id)
                  if (r.ok) say(r.say)
                }}
              />
            ))}
          </div>
          <p className="small-text garden-next">{nextLine(garden)}</p>
        </section>
        <p className="visually-hidden" role="status" aria-live="polite">
          {said}
        </p>
      </div>
    </div>
  )
}

function Head({ garden, year, news }: { garden: ReturnType<typeof useGarden>['garden']; year: number | null; news: string }) {
  return (
    <header className="challenges-head garden-head">
      <h1>Garden</h1>
      <div className="garden-state">
        <span className="garden-season">{seasonChip(garden.season)}</span>
        <span className="garden-total">
          {garden.plants} plant{garden.plants === 1 ? '' : 's'}
        </span>
        {news && <span className="garden-news">{news}</span>}
      </div>
      {year === null && <span className="visually-hidden">Nothing planted yet.</span>}
    </header>
  )
}

/** Finding a book's plant, across every reading year (T-0066). */
function Find({
  query,
  onQuery,
  hits,
  onPick,
}: {
  query: string
  onQuery: (q: string) => void
  hits: Found[]
  onPick: (hit: Found) => void
}) {
  return (
    <div className="garden-find">
      <label className="visually-hidden" htmlFor="garden-find">
        Find a book in the garden
      </label>
      <input
        id="garden-find"
        type="search"
        className="input"
        placeholder="Find a book…"
        value={query}
        autoComplete="off"
        onChange={(e) => onQuery(e.target.value)}
      />
      {query.trim() !== '' && (
        <ul className="garden-find-hits">
          {hits.length === 0 ? (
            <li className="small-text garden-find-none">No plant for that book.</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.plant.id}>
                <button type="button" className="btn small" onClick={() => onPick(hit)}>
                  {hit.plant.book.title} <span className="small-text">· {hit.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

/** What she picked up, with the way back and the way into the book (T-0063 §1, T-0066). */
function PickedPanel({ plant, onPutBack, onShowBook }: { plant: Plant; onPutBack: () => void; onShowBook?: (id: string) => void }) {
  return (
    <div className="garden-picked">
      <p>
        <strong>{plant.kind.name}</strong> · {plant.book.title}
      </p>
      <p className="small-text">{plantLabel(plant)}</p>
      <div className="chips">
        <button type="button" className="btn small" onClick={onPutBack}>
          Put back
        </button>
        {onShowBook && (
          <button type="button" className="btn small" onClick={() => onShowBook(plant.id)}>
            Open book
          </button>
        )}
      </div>
    </div>
  )
}

function ItemButton({
  id,
  name,
  books,
  season,
  unlocked,
  here,
  placed,
  onPlace,
  onTakeAway,
}: {
  id: GardenItemId
  name: string
  books: number
  season: Season | null
  unlocked: boolean
  /** unlocked and in its season: a seasonal item waits for its season (T-0066) */
  here: boolean
  placed: boolean
  onPlace: () => void
  onTakeAway: () => void
}) {
  if (!unlocked)
    return (
      <span className="btn small garden-item locked" aria-disabled="true" data-item={id}>
        {lockedLine(name, books)}
      </span>
    )
  if (!here && season)
    return (
      <span className="btn small garden-item off-season" aria-disabled="true" data-item={id}>
        {name} · in {SEASON_LABEL[season].toLowerCase()}
      </span>
    )
  return (
    <button
      type="button"
      className={placed ? 'btn small garden-item placed' : 'btn small garden-item'}
      data-item={id}
      aria-pressed={placed}
      onClick={placed ? onTakeAway : onPlace}
    >
      {placed ? `${name} · Take away` : name}
    </button>
  )
}
