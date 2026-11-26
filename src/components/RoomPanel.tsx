import { useEffect, useState } from 'react'
import {
  DECOR_NAMES,
  DEFAULT_ROOM,
  NIGHT_MODES,
  ROOM_EXTRAS,
  WALLPAPERS,
  WOODS,
  cleanRoom,
  isNightNow,
  moveDecor,
  toggleDecor,
} from '#/lib/room'
import type { Room, Wallpaper, Wood } from '#/lib/room'
import type { ShopDecorKind } from '#/lib/shelfLayout'

const KEY = 'hannas-reading-list:room'
const NONE: readonly ShopDecorKind[] = []

/**
 * Her room (Make the room yours), remembered on this device. The wallpaper
 * goes on <html data-wallpaper>, so every page's CSS can follow it.
 *
 * `owned`: the decorations she bought in the creature shop (T-0031 §11, from her choices log, so
 * the same on every device). One she hasn't seen here yet joins at the end, switched on; whether
 * it shows stays per device. Reset switches them on again and keeps them.
 */
export function useRoom(owned: readonly ShopDecorKind[] = NONE) {
  const read = () => {
    try {
      return cleanRoom(JSON.parse(localStorage.getItem(KEY) ?? 'null'), owned)
    } catch {
      return cleanRoom(DEFAULT_ROOM, owned)
    }
  }
  const [room, setState] = useState<Room>(read)
  const ownedKey = owned.join(',')
  // a purchase seen for the first time (here or synced from another device): it joins the room
  useEffect(() => {
    setState((prev) => cleanRoom(prev, owned))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedKey])
  useEffect(() => {
    document.documentElement.dataset.wallpaper = room.wallpaper
  }, [room.wallpaper])
  /**
   * Night mode on the pages (D-0085). With `auto` the hour is re-read every minute, so
   * evening arrives by itself while she is looking, exactly as the room's own Day & night
   * does (D-0045). It goes on <html>, so every page's CSS follows it.
   */
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    if (room.night !== 'auto') return
    setHour(new Date().getHours())
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [room.night])
  useEffect(() => {
    document.documentElement.dataset.night = isNightNow(room.night, hour) ? 'on' : 'off'
  }, [room.night, hour])
  const setRoom = (raw: Room) => {
    const next = cleanRoom(raw, owned)
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  return [room, setRoom] as const
}

/** The 🎨 Room panel: wood, wallpaper, books and decorations; the shelf changes live behind it. */
export function RoomPanel({ room, onRoom, onClose }: { room: Room; onRoom: (room: Room) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    // no dark backdrop: she sees the shelf change behind the panel
    <section className="quick-sheet room-sheet" role="dialog" aria-label="Make the room yours">
      <div className="quick-head">
        <h2>
          <span aria-hidden>🎨</span> Your room
        </h2>
        <button className="btn icon small" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="room-row" role="group" aria-label="Wood">
        <span className="muted small-text">Wood</span>
        <div className="room-choices">
          {(Object.keys(WOODS) as Wood[]).map((w) => (
            <button key={w} className={`room-choice${room.wood === w ? ' active' : ''}`} aria-pressed={room.wood === w} onClick={() => onRoom({ ...room, wood: w })}>
              <span className={`room-swatch wood-${w}`} aria-hidden />
              {WOODS[w]}
            </button>
          ))}
        </div>
      </div>

      <div className="room-row" role="group" aria-label="Wallpaper">
        <span className="muted small-text">Wallpaper (every page)</span>
        <div className="room-choices">
          {(Object.keys(WALLPAPERS) as Wallpaper[]).map((w) => (
            <button key={w} className={`room-choice${room.wallpaper === w ? ' active' : ''}`} aria-pressed={room.wallpaper === w} onClick={() => onRoom({ ...room, wallpaper: w })}>
              <span className={`room-swatch paper-${w}`} aria-hidden />
              {WALLPAPERS[w]}
            </button>
          ))}
        </div>
      </div>

      {/* above the decorations, so it shows on a phone without scrolling (T-0034) */}
      <div className="room-row" role="group" aria-label="Books">
        <span className="muted small-text">Books</span>
        <label className="room-toggle">
          <input type="checkbox" checked={room.detailedBooks} onChange={() => onRoom({ ...room, detailedBooks: !room.detailedBooks })} />
          <span>Detailed books</span>
        </label>
      </div>

      {/* night mode for the pages (D-0085): after dark by default, because she reads in bed */}
      <div className="room-row" role="group" aria-label="Night mode">
        <span className="muted small-text">Night mode</span>
        <div className="segmented night-pick">
          {NIGHT_MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={room.night === id ? 'active' : undefined}
              aria-pressed={room.night === id}
              onClick={() => room.night !== id && onRoom({ ...room, night: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* the cosy room extras (D-0045): one group, so the decorations below stay reachable on a phone */}
      <div className="room-row" role="group" aria-label="Your room">
        <span className="muted small-text">Your room</span>
        {ROOM_EXTRAS.map(({ key, label }) => (
          <label key={key} className="room-toggle">
            <input type="checkbox" checked={room[key]} onChange={() => onRoom({ ...room, [key]: !room[key] })} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="room-row">
        <span className="muted small-text">Decorations, from the top shelf down</span>
        <ol className="room-decor">
          {room.decor.map((d, i) => (
            <li key={d.kind} className={d.on ? '' : 'off'}>
              <label className="room-toggle">
                <input type="checkbox" checked={d.on} onChange={() => onRoom(toggleDecor(room, d.kind))} />
                <span>{DECOR_NAMES[d.kind]}</span>
              </label>
              <span className="room-move">
                <button className="btn icon small" aria-label={`Move ${DECOR_NAMES[d.kind]} up`} disabled={i === 0} onClick={() => onRoom(moveDecor(room, d.kind, -1))}>
                  ↑
                </button>
                <button
                  className="btn icon small"
                  aria-label={`Move ${DECOR_NAMES[d.kind]} down`}
                  disabled={i === room.decor.length - 1}
                  onClick={() => onRoom(moveDecor(room, d.kind, 1))}
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="dashboard-bar-actions">
        <button className="btn small" onClick={() => onRoom(DEFAULT_ROOM)}>
          Reset
        </button>
        <button className="btn small primary" onClick={onClose}>
          Done
        </button>
      </div>
    </section>
  )
}
