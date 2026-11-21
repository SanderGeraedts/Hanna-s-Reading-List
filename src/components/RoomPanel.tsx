import { useEffect, useState } from 'react'
import { DECOR_NAMES, DEFAULT_ROOM, WALLPAPERS, WOODS, cleanRoom, moveDecor, toggleDecor } from '#/lib/room'
import type { Room, Wallpaper, Wood } from '#/lib/room'

const KEY = 'hannas-reading-list:room'

/**
 * Her room (Make the room yours), remembered on this device. The wallpaper
 * goes on <html data-wallpaper>, so every page's CSS can follow it.
 */
export function useRoom() {
  const [room, setState] = useState<Room>(() => {
    try {
      return cleanRoom(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
    } catch {
      return DEFAULT_ROOM
    }
  })
  useEffect(() => {
    document.documentElement.dataset.wallpaper = room.wallpaper
  }, [room.wallpaper])
  const setRoom = (next: Room) => {
    setState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  return [room, setRoom] as const
}

/** The 🎨 Room panel: wood, wallpaper and decorations; the shelf changes live behind it. */
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
