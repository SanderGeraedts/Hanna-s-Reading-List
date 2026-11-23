import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { GARDEN_ITEMS } from '#/lib/garden/numbers'
import type { GardenItemId } from '#/lib/garden/numbers'
import { startYear, yearOf } from '#/lib/garden/garden'
import type { Plant } from '#/lib/garden/garden'
import type { Spot } from '#/lib/garden/spots'
import { EMPTY_GARDEN, LEFT_SAY, countLine, emptyYear, gardenSentence, lockedLine, nextLine, pickedUpSay, plantLabel, seasonChip } from '#/lib/garden/words'
import { gardenLayout } from '#/lib/garden/view'
import { useSay } from './creatures/parts'
import { usePhone, useReducedMotion, webglAvailable } from './creatures/pose'
import { SceneBoundary } from './creatures/SceneBoundary'
import { GardenFlat } from './garden/GardenFlat'
import { GardenScene } from './garden/GardenScene'
import { SpotLayer } from './garden/SpotLayer'
import { flatPlace, sceneAspect, sceneColumns, scenePlace } from './garden/gardenView'
import { useGarden } from './garden/useGarden'

/**
 * The 🌱 Garden tab (T-0061 Design §1–§5, T-0063, T-0064): the year's garden
 * drawn flat on a phone and in the cosy 3D on a computer (D-0051), the chips
 * for her reading years, the plants she can move between spots and beds, the
 * garden items she has unlocked by reading, and the season.
 */

interface Props {
  books: Book[]
  /** something is over the page (the book panel, a sheet): the 3D garden stops rendering */
  paused?: boolean
}

export function GardenPage({ books, paused }: Props) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const { garden, move, place, takeAway } = useGarden(books, { phone })
  const [said, say] = useSay()
  const [year, setYear] = useState<number | null>(null)
  const [pickedId, setPicked] = useState<string | null>(null)
  const shown = year !== null && garden.years.some((y) => y.year === year) ? year : startYear(garden)
  const current = yearOf(garden, shown)
  // the flat garden on a phone, and wherever 3D can't be drawn (D-0051 §4)
  const flat = phone || !gl
  const columns = flat ? 1 : sceneColumns(current?.beds ?? 1)
  const layout = useMemo(() => gardenLayout(current?.beds ?? 1, columns), [current?.beds, columns])
  const picked = current?.plants.find((p) => p.id === pickedId) ?? null
  const stage = useRef<HTMLDivElement>(null)

  // a plant picked up in one year garden is put down when she looks at another
  useEffect(() => setPicked(null), [shown])

  if (!garden.years.length || !current) {
    return (
      <div className="dashboard">
        <div className="garden-page">
          <Head garden={garden} year={null} />
          <p className="creatures-empty">{EMPTY_GARDEN}</p>
        </div>
      </div>
    )
  }

  const onDrop = (at: Spot) => {
    if (!picked) return
    const r = move(current, picked.id, at)
    setPicked(null)
    say(r.ok ? r.say : r.why === 'same-spot' ? LEFT_SAY : LEFT_SAY)
  }

  return (
    <div className="dashboard">
      <div className="garden-page">
        <Head garden={garden} year={current.year} />
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
                  <GardenFlat year={current} season={garden.season} columns={1} reduce={reduce} picked={pickedId} />
                ) : (
                  <SceneBoundary onFail={() => setGl(false)}>
                    <GardenScene year={current} season={garden.season} reduce={reduce} paused={paused} />
                  </SceneBoundary>
                )}
                <SpotLayer
                  year={current}
                  place={(bed, spot) => (flat ? flatPlace(layout, bed, spot) : scenePlace(layout, bed, spot))}
                  picked={picked}
                  coarse={phone}
                  onPick={(p) => {
                    setPicked(p.id)
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
              <p className="garden-counts">{countLine(current)}</p>
              {picked && <PickedPanel plant={picked} onPutBack={() => {
                setPicked(null)
                say(LEFT_SAY)
              }} />}
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
                unlocked={garden.unlocked.includes(item.id)}
                placed={current.items.has(item.id)}
                onPlace={() => {
                  const r = place(current.year, item.id)
                  if (r.ok) say(r.say)
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

function Head({ garden, year }: { garden: ReturnType<typeof useGarden>['garden']; year: number | null }) {
  return (
    <header className="challenges-head garden-head">
      <h1>Garden</h1>
      <div className="garden-state">
        <span className="garden-season">{seasonChip(garden.season)}</span>
        <span className="garden-total">
          {garden.plants} plant{garden.plants === 1 ? '' : 's'}
        </span>
      </div>
      {year === null && <span className="visually-hidden">Nothing planted yet.</span>}
    </header>
  )
}

/** What she picked up, with the way back (T-0063 §1). */
function PickedPanel({ plant, onPutBack }: { plant: Plant; onPutBack: () => void }) {
  return (
    <div className="garden-picked">
      <p>
        <strong>{plant.kind.name}</strong> · {plant.book.title}
      </p>
      <p className="small-text">{plantLabel(plant)}</p>
      <button type="button" className="btn small" onClick={onPutBack}>
        Put back
      </button>
    </div>
  )
}

function ItemButton({
  id,
  name,
  books,
  unlocked,
  placed,
  onPlace,
  onTakeAway,
}: {
  id: GardenItemId
  name: string
  books: number
  unlocked: boolean
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
