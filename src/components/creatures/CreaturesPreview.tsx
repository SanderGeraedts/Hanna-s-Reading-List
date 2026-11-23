import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SPECIES, redListLabel } from '#/lib/creatures/species'
import type { Species } from '#/lib/creatures/species'
import { useRoom } from '#/components/RoomPanel'
import type { Wallpaper } from '#/lib/room'
import { disposeCreature, makeCreature, modelFor } from './index'
import type { CreatureQuality } from './model'

/**
 * The Creatures section of /style (T-0027 Design §9): all 20 in species order,
 * slowly turning in ONE canvas behind a grid of tiles (browsers allow only about
 * 16 canvases), with name, tier and Red List label under each. A creature
 * without a model file yet shows an empty tile.
 */

/** One turn in about 12 seconds. */
const TURN = (Math.PI * 2) / 12
/** Seen about 10° from above, like the den. */
const TILT = 0.17

interface Tile {
  x: number
  y: number
  size: number
}

function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const on = () => setVisible(!document.hidden)
    on()
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return visible
}

function usePhone() {
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 720px), (pointer: coarse)')
    const on = () => setPhone(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}

export function CreaturesPreview() {
  const [room] = useRoom()
  const [wallpaper, setWallpaper] = useState<Wallpaper>(room.wallpaper)
  const [shiny, setShiny] = useState(false)
  const visible = usePageVisible()
  const phone = usePhone()
  const grid = useRef<HTMLDivElement>(null)
  const squares = useRef<Array<HTMLDivElement | null>>([])
  const [tiles, setTiles] = useState<Tile[]>([])

  // only for this page: the saved room stays as it is
  useEffect(() => {
    document.documentElement.dataset.wallpaper = wallpaper
  }, [wallpaper])

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
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="creatures-preview">
      <div className="chips">
        {(['lavender', 'midnight'] as const).map((w) => (
          <button key={w} className={`btn small${wallpaper === w ? ' primary' : ''}`} aria-pressed={wallpaper === w} onClick={() => setWallpaper(w)}>
            {w === 'lavender' ? 'Lavender' : 'Midnight'}
          </button>
        ))}
        <label className="check">
          <input type="checkbox" checked={shiny} onChange={(e) => setShiny(e.target.checked)} /> <span>Shiny</span>
        </label>
      </div>
      <div className="creatures-grid" ref={grid}>
        <Canvas
          className="creatures-canvas"
          frameloop={visible ? 'always' : 'never'}
          shadows={false}
          dpr={phone ? [1, 1.5] : [1, 2]}
          orthographic
          camera={{ position: [0, 0, 1000], near: 1, far: 2000 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <PixelCamera />
          <hemisphereLight args={['#ffe8cc', '#4a2f1e', 1.3]} />
          <ambientLight intensity={0.28} color="#ffdcb4" />
          <directionalLight position={[-3, 4, 5]} intensity={2.4} color="#ffdcae" />
          <directionalLight position={[0, 3, -4]} intensity={0.5} color="#fff3e0" />
          {SPECIES.map((s, i) =>
            modelFor(s.id) && tiles[i]?.size ? (
              <Turning key={s.id} species={s} tile={tiles[i]} shiny={shiny} quality={phone ? 'low' : 'high'} />
            ) : null,
          )}
        </Canvas>
        {SPECIES.map((s, i) => (
          <figure key={s.id} className="creature-tile">
            <div
              className="creature-square"
              ref={(el) => {
                squares.current[i] = el
              }}
            >
              {!modelFor(s.id) && <span className="small-text">Not modelled yet</span>}
            </div>
            <figcaption>
              <strong>{s.name}</strong>
              <span className="small-text">
                {s.tier} · {redListLabel(s)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

/** An orthographic camera in CSS pixels: (0, 0) is the grid's top-left corner, y down is negative. */
function PixelCamera() {
  const { camera, size } = useThree()
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    cam.left = 0
    cam.right = size.width
    cam.top = 0
    cam.bottom = -size.height
    cam.updateProjectionMatrix()
  }, [camera, size])
  return null
}

function Turning({ species, tile, shiny, quality }: { species: Species; tile: Tile; shiny: boolean; quality: CreatureQuality }) {
  const creature = useMemo(
    () => makeCreature(species.id, { quality, palette: shiny ? species.shinyPalette : species.palette }),
    [species, shiny, quality],
  )
  useEffect(() => () => disposeCreature(creature), [creature])
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * TURN
  })
  // about 1 unit tall: fill 80 % of the square, standing on its lower part
  const scale = tile.size * 0.8
  return (
    <group position={[tile.x, -tile.y - tile.size * 0.42, 0]} scale={scale} rotation={[TILT, 0, 0]}>
      <group ref={spin} rotation={[0, -0.35, 0]}>
        <primitive object={creature} />
      </group>
    </group>
  )
}
