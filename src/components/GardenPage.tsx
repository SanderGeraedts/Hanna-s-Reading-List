import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { GARDEN_ITEMS } from '#/lib/garden/numbers'
import type { GardenItemId } from '#/lib/garden/numbers'
import { startYear, yearOf } from '#/lib/garden/garden'
import type { YearGarden } from '#/lib/garden/garden'
import { SEASONS, SEASON_LABEL, isNight } from '#/lib/garden/seasons'
import type { Season } from '#/lib/garden/seasons'
import { EMPTY_GARDEN, countLine, emptyYear, gardenSentence, lockedLine, nextLine, seasonChip } from '#/lib/garden/words'
import { findPlants } from '#/lib/garden/find'
import type { Found } from '#/lib/garden/find'
import { newsLine } from '#/lib/garden/seen'
import { gardenLayout } from '#/lib/garden/view'
import { useSay } from './creatures/parts'
import { usePhone, useReducedMotion, webglAvailable } from './creatures/pose'
import { SceneBoundary } from './creatures/SceneBoundary'
import { GardenFlat } from './garden/GardenFlat'
import { GardenScene } from './garden/GardenScene'
import { SpotLayer } from './garden/SpotLayer'
import { PlantPeek } from './garden/PlantPeek'
import { GardenShareButton } from './garden/GardenShare'
import { flatPlace, sceneAspect, sceneColumns, scenePlace } from './garden/gardenView'
import { useGarden } from './garden/useGarden'
import { useSeen } from './garden/useSeen'

/**
 * The 🌱 Garden tab (T-0061 Design §1–§5, T-0063, T-0064, T-0066): the year's
 * garden drawn flat on a phone and in the cosy 3D on a computer (D-0051), the
 * chips for her reading years, one bed at a time for a closer look, the cover
 * behind a plant, finding a book, a look at another season or after dark, a
 * picture to share, and the garden items she has unlocked by reading.
 *
 * Nothing here moves a plant: they stand in the order she finished the books
 * (D-0071 §1), so the garden is read, not arranged.
 */

interface Props {
  books: Book[]
  /** something is over the page (the book panel, a sheet): the 3D garden stops rendering */
  paused?: boolean
  /** opens a book's panel from its plant (T-0066) */
  onShowBook?: (id: string) => void
  /** the hour of the day, for tests; the device's clock otherwise */
  hour?: number
}

/** One bed on its own, as a year garden of its own, so either view draws it unchanged. */
function oneBed(year: YearGarden, bed: number): YearGarden {
  return {
    ...year,
    beds: 1,
    plants: year.plants.filter((p) => p.bed === bed).map((p) => ({ ...p, bed: 0 })),
    items: new Map(),
  }
}

export function GardenPage({ books, paused, onShowBook, hour }: Props) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const [said, say] = useSay()
  const [year, setYear] = useState<number | null>(null)
  const [bed, setBed] = useState<number | null>(null)
  const [peekId, setPeek] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [foundId, setFound] = useState<string | null>(null)
  // a look at another season or after dark: never saved, always back to now (D-0071 §5)
  const [look, setLook] = useState<Season | null>(null)
  const [dark, setDark] = useState<boolean | null>(null)
  const { garden, place: placeItem, takeAway } = useGarden(books, { phone, season: look ?? undefined })
  const night = dark ?? isNight(hour ?? new Date().getHours())
  const looking = look !== null || dark !== null
  const seen = useSeen(garden, true)
  const news = seen.plants
  const shown = year !== null && garden.years.some((y) => y.year === year) ? year : startYear(garden)
  const current = yearOf(garden, shown)
  // the flat garden on a phone, and wherever 3D can't be drawn (D-0051 §4)
  const flat = phone || !gl
  const inBed = current && bed !== null && bed < current.beds ? oneBed(current, bed) : null
  const drawn = inBed ?? current
  const columns = flat ? 1 : sceneColumns(drawn?.beds ?? 1)
  const layout = useMemo(() => gardenLayout(drawn?.beds ?? 1, columns), [drawn?.beds, columns])
  const peeked = drawn?.plants.find((p) => p.id === peekId) ?? null
  const hits = useMemo(() => findPlants(garden, query), [garden, query])
  const stage = useRef<HTMLDivElement>(null)

  // a cover left open in one year or bed is closed when she looks somewhere else,
  // and a closer look belongs to the year it was taken in
  useEffect(() => setPeek(null), [shown, bed])
  useEffect(() => setBed(null), [shown])

  if (!garden.years.length || !current || !drawn) {
    return (
      <div className="dashboard">
        <div className="garden-page">
          <Head garden={garden} year={null} news="" night={night} />
          <p className="creatures-empty">{EMPTY_GARDEN}</p>
        </div>
      </div>
    )
  }

  const place = (b: number, spot: number) => (flat ? flatPlace(layout, b, spot) : scenePlace(layout, b, spot))

  const onFound = (hit: Found) => {
    setYear(hit.year)
    setBed(null)
    setFound(hit.plant.id)
    setQuery('')
    say(`${hit.plant.book.title} stands in the ${hit.label} garden, bed ${hit.plant.bed + 1}.`)
  }

  return (
    <div className="dashboard">
      <div className="garden-page">
        <Head garden={garden} year={current.year} news={newsLine(news)} night={night} />
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
        {current.beds > 1 && (
          <div className="chips garden-beds" role="group" aria-label="Look closer">
            <button
              type="button"
              className={bed === null ? 'btn small active' : 'btn small'}
              aria-pressed={bed === null}
              onClick={() => setBed(null)}
            >
              Whole year
            </button>
            {Array.from({ length: current.beds }, (_, b) => (
              <button
                key={b}
                type="button"
                className={bed === b ? 'btn small active' : 'btn small'}
                aria-pressed={bed === b}
                onClick={() => setBed(b)}
              >
                Bed {b + 1}
              </button>
            ))}
          </div>
        )}
        <section className="dash-card garden-card" aria-label={`${current.label} garden`}>
          {drawn.plants.length === 0 ? (
            <p className="creatures-empty">{emptyYear(current.label)}</p>
          ) : (
            <>
              <div
                ref={stage}
                className={`garden-stage ${flat ? 'flat' : 'scene'}${night ? ' night' : ''}`}
                style={{ aspectRatio: flat ? `${layout.width} / ${layout.depth}` : `${sceneAspect(layout)}` }}
              >
                {flat ? (
                  <GardenFlat year={drawn} season={garden.season} night={night} columns={1} reduce={reduce} found={foundId} />
                ) : (
                  <SceneBoundary onFail={() => setGl(false)}>
                    <GardenScene year={drawn} season={garden.season} night={night} reduce={reduce} paused={paused} />
                  </SceneBoundary>
                )}
                <SpotLayer
                  year={drawn}
                  place={place}
                  peeked={peekId}
                  news={news}
                  found={foundId}
                  onPeek={(p) => {
                    setPeek(p.id)
                    setFound(null)
                  }}
                  onClose={() => setPeek(null)}
                />
                {peeked && (
                  <PlantPeek plant={peeked} at={place(peeked.bed, peeked.spot)} onClose={() => setPeek(null)} onShowBook={onShowBook} />
                )}
              </div>
              <p className="visually-hidden">{gardenSentence(drawn, garden.season)}</p>
              <div className="garden-tools">
                <p className="garden-counts">{countLine(drawn)}</p>
                <GardenShareButton stage={stage} label={`${current.label} garden`} line={countLine(drawn)} />
              </div>
            </>
          )}
        </section>
        <Look
          season={garden.season}
          night={night}
          looking={looking}
          onSeason={setLook}
          onDark={setDark}
          onNow={() => {
            setLook(null)
            setDark(null)
            say('Back to now.')
          }}
        />
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
                  const r = placeItem(current.year, item.id)
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

function Head({
  garden,
  year,
  news,
  night,
}: {
  garden: ReturnType<typeof useGarden>['garden']
  year: number | null
  news: string
  night: boolean
}) {
  return (
    <header className="challenges-head garden-head">
      <h1>Garden</h1>
      <div className="garden-state">
        <span className="garden-season">
          {seasonChip(garden.season)}
          {night ? ' · 🌙 Night' : ''}
        </span>
        <span className="garden-total">
          {garden.plants} plant{garden.plants === 1 ? '' : 's'}
        </span>
        {news && <span className="garden-news">{news}</span>}
      </div>
      {year === null && <span className="visually-hidden">Nothing planted yet.</span>}
    </header>
  )
}

/** A look at another season or after dark, never saved (D-0071 §5). */
function Look({
  season,
  night,
  looking,
  onSeason,
  onDark,
  onNow,
}: {
  season: Season
  night: boolean
  looking: boolean
  onSeason: (s: Season) => void
  onDark: (d: boolean) => void
  onNow: () => void
}) {
  return (
    <section className="dash-card garden-look" aria-labelledby="garden-look-title">
      <div className="dash-card-head">
        <h2 id="garden-look-title">Have a look</h2>
        {looking && (
          <span className="muted small-text">
            Looking at {SEASON_LABEL[season].toLowerCase()}
            {night ? ' at night' : ''}
          </span>
        )}
      </div>
      <div className="chips garden-look-chips" role="group" aria-label="Have a look">
        {SEASONS.map((s) => (
          <button
            key={s}
            type="button"
            className={s === season ? 'btn small active' : 'btn small'}
            aria-pressed={s === season}
            onClick={() => onSeason(s)}
          >
            {seasonChip(s)}
          </button>
        ))}
        <button type="button" className={night ? 'btn small active' : 'btn small'} aria-pressed={night} onClick={() => onDark(!night)}>
          🌙 Night
        </button>
        {looking && (
          <button type="button" className="btn small" onClick={onNow}>
            Now
          </button>
        )}
      </div>
    </section>
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

/**
 * A garden item: unlocked by reading, and put in the garden or taken away with
 * a tap. Plants are no longer moved (D-0071 §1), but an item still is: it is
 * one tap, never a drag.
 */
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
