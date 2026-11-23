import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SHELF } from '#/lib/shelfLayout'
import type { Room } from '#/lib/room'
import { lampLightOn } from '#/lib/roomExtras'
import type { PlantStage, Season } from '#/lib/roomExtras'

/**
 * The cosy room extras (D-0045): a reading corner, a plant that grows with her
 * reading and the season's decorations, standing on the floor beside the
 * bookcase. Day & night is in the scene's lighting, not here.
 *
 * Every piece is merged into **one geometry per material**, so an extra costs
 * one draw per material and nothing per leaf, petal or cushion; the budget is
 * +10 draw calls a frame for all of them together on a phone.
 */

interface Piece {
  geometry: THREE.BufferGeometry
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
}

/** One geometry out of many little boxes and cylinders, so a whole prop is one draw. */
function merge(pieces: Piece[]): THREE.BufferGeometry {
  const parts = pieces.map(({ geometry, position, rotation, scale }) => {
    const g = geometry.clone()
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(position ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation ?? [0, 0, 0]))),
      new THREE.Vector3(...(scale ?? [1, 1, 1])),
    )
    g.applyMatrix4(m)
    g.deleteAttribute('uv')
    return g
  })
  const out = mergeGeometries(parts, false)!
  for (const g of parts) g.dispose()
  out.computeVertexNormals()
  return out
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cyl = (r: number, h: number, seg = 10) => new THREE.CylinderGeometry(r, r, h, seg)
const ball = (r: number, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2))

/** The accent of the wallpaper she chose, for the blanket, the flowers and the blooms. */
const accentFor = (room: Room) => (room.wallpaper === 'midnight' ? '#8da7d8' : '#b9a3d8')

// ---------------------------------------------------------------------------
// The reading corner: a chair with a blanket and a floor lamp
// ---------------------------------------------------------------------------

function ReadingCorner({ room, night }: { room: Room; night: boolean }) {
  const g = useMemo(() => {
    const seatH = 0.4
    const chair = merge([
      // seat, back and two arms
      { geometry: box(0.56, 0.14, 0.52), position: [0, seatH, 0] },
      { geometry: box(0.56, 0.46, 0.12), position: [0, seatH + 0.22, -0.2] },
      { geometry: box(0.08, 0.2, 0.52), position: [-0.24, seatH + 0.1, 0] },
      { geometry: box(0.08, 0.2, 0.52), position: [0.24, seatH + 0.1, 0] },
      // a cushion in the seat
      { geometry: box(0.44, 0.08, 0.4), position: [0, seatH + 0.1, 0.02] },
      // four legs
      ...[-0.22, 0.22].flatMap((x) =>
        [-0.2, 0.2].map((z) => ({ geometry: cyl(0.022, seatH - 0.07, 6), position: [x, (seatH - 0.07) / 2, z] as [number, number, number] })),
      ),
    ])
    // a blanket folded over the near arm
    const blanket = merge([
      { geometry: box(0.12, 0.03, 0.34), position: [0.24, seatH + 0.21, 0.04] },
      { geometry: box(0.03, 0.22, 0.34), position: [0.295, seatH + 0.1, 0.04] },
      { geometry: box(0.03, 0.16, 0.34), position: [0.185, seatH + 0.13, 0.04] },
    ])
    // the lamp: a slim pole on a disc, standing at the bookcase's shoulder
    const pole = merge([
      { geometry: cyl(0.1, 0.02, 14), position: [0, 0.01, 0] },
      { geometry: cyl(0.012, 1.1, 8), position: [0, 0.56, 0] },
    ])
    const shade = new THREE.CylinderGeometry(0.1, 0.13, 0.17, 14, 1, true)
    shade.translate(0, 1.18, 0)
    shade.deleteAttribute('uv')
    return { chair, blanket, pole, shade }
  }, [])
  useEffect(() => () => Object.values(g).forEach((x) => x.dispose()), [g])

  const m = useMemo(
    () => ({
      chair: new THREE.MeshStandardMaterial({ color: '#8e6b54', roughness: 0.85 }),
      blanket: new THREE.MeshStandardMaterial({ color: accentFor(room), roughness: 1 }),
      pole: new THREE.MeshStandardMaterial({ color: '#b08d57', metalness: 0.6, roughness: 0.4 }),
      shade: new THREE.MeshStandardMaterial({
        color: '#f6e4c2',
        roughness: 1,
        side: THREE.DoubleSide,
        emissive: new THREE.Color('#ffd79a'),
        emissiveIntensity: 0,
      }),
    }),
    [room.wallpaper], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  // the shade glows in the evening; the glow itself costs no light
  m.shade.emissiveIntensity = night ? 1.1 : 0

  return (
    <group>
      <mesh castShadow receiveShadow geometry={g.chair} material={m.chair} />
      <mesh castShadow receiveShadow geometry={g.blanket} material={m.blanket} />
      <mesh castShadow receiveShadow geometry={g.pole} material={m.pole} position={LAMP} />
      <mesh geometry={g.shade} material={m.shade} position={LAMP} />
    </group>
  )
}

/** Where the floor lamp stands in the corner's own frame: at the bookcase's shoulder. */
const LAMP: [number, number, number] = [0.34, 0, -0.18]

// ---------------------------------------------------------------------------
// The plant that grows with the books she finished this year
// ---------------------------------------------------------------------------

const PLANT_SIZE: Record<PlantStage, number> = { sprout: 0.22, small: 0.45, medium: 0.7, full: 1, flowering: 1 }
const PLANT_LEAVES: Record<PlantStage, number> = { sprout: 2, small: 5, medium: 9, full: 14, flowering: 14 }

function GrowingPlant({ stage, room }: { stage: PlantStage; room: Room }) {
  const g = useMemo(() => {
    const pot = merge([
      { geometry: new THREE.CylinderGeometry(0.08, 0.055, 0.11, 14), position: [0, 0.055, 0] },
      { geometry: cyl(0.084, 0.018, 14), position: [0, 0.112, 0] },
    ])
    const size = PLANT_SIZE[stage]
    const n = PLANT_LEAVES[stage]
    const stemH = 0.06 + 0.2 * size
    // a tuft of leaves fanning out of a short stem, in two or three tiers, not a spiral
    const leaves: Piece[] = [{ geometry: cyl(0.008, stemH, 6), position: [0, 0.12 + stemH / 2, 0] }]
    const tiers = Math.min(3, Math.max(1, Math.round(n / 5)))
    let made = 0
    for (let t = 0; t < tiers && made < n; t++) {
      const per = Math.ceil((n - made) / (tiers - t))
      const up = 0.12 + stemH * (0.45 + (0.55 * t) / Math.max(1, tiers - 1))
      const reach = (0.05 + 0.1 * size) * (1 - t * 0.22)
      for (let i = 0; i < per && made < n; i++, made++) {
        const a = (i / per) * Math.PI * 2 + t * 0.7
        leaves.push({
          geometry: ball(0.028 + 0.022 * size, 8),
          position: [Math.cos(a) * reach, up, Math.sin(a) * reach],
          scale: [1.9, 0.4, 0.9],
          rotation: [0, -a, 0.45],
        })
      }
    }
    const foliage = merge(leaves)
    const blooms =
      stage === 'flowering'
        ? merge(
            Array.from({ length: 6 }, (_, i) => {
              const a = i * 1.047 + 0.4
              return { geometry: ball(0.016, 7), position: [Math.cos(a) * 0.085, 0.26 + (i % 3) * 0.05, Math.sin(a) * 0.085] as [number, number, number] }
            }),
          )
        : null
    return { pot, foliage, blooms }
  }, [stage])
  useEffect(
    () => () => {
      g.pot.dispose()
      g.foliage.dispose()
      g.blooms?.dispose()
    },
    [g],
  )
  const m = useMemo(
    () => ({
      pot: new THREE.MeshStandardMaterial({ color: '#c8724c', roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#6f9c6b', roughness: 0.8 }),
      bloom: new THREE.MeshStandardMaterial({ color: accentFor(room), roughness: 0.7 }),
    }),
    [room.wallpaper], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  return (
    <group>
      <mesh castShadow receiveShadow geometry={g.pot} material={m.pot} />
      <mesh castShadow receiveShadow geometry={g.foliage} material={m.leaf} />
      {g.blooms && <mesh castShadow receiveShadow geometry={g.blooms} material={m.bloom} />}
    </group>
  )
}

// ---------------------------------------------------------------------------
// The season's decorations
// ---------------------------------------------------------------------------

/** Each season as two merged pieces: the body and its trim. */
function seasonGeometry(season: Season): { body: THREE.BufferGeometry; trim: THREE.BufferGeometry } {
  if (season === 'pumpkins') {
    const sizes = [0.09, 0.06, 0.045]
    return {
      body: merge(sizes.map((r, i) => ({ geometry: ball(r, 12), position: [i * 0.16 - 0.16, r * 0.82, i * 0.03], scale: [1, 0.82, 1] }))),
      trim: merge(sizes.map((r, i) => ({ geometry: cyl(r * 0.12, r * 0.5, 6), position: [i * 0.16 - 0.16, r * 1.6, i * 0.03] }))),
    }
  }
  if (season === 'tree') {
    // a little tree, low enough to stay on the strip of floor in front of the case
    const tiers = [
      { r: 0.11, y: 0.17, h: 0.18 },
      { r: 0.08, y: 0.28, h: 0.15 },
      { r: 0.05, y: 0.37, h: 0.12 },
    ]
    return {
      body: merge(tiers.map((t) => ({ geometry: new THREE.ConeGeometry(t.r, t.h, 12), position: [0, t.y, 0] }))),
      trim: merge([
        { geometry: cyl(0.022, 0.1, 8), position: [0, 0.05, 0] },
        // a string of baubles round the tree, and a star on top
        ...Array.from({ length: 10 }, (_, i) => {
          const a = i * 1.1
          const u = i / 10
          const r = 0.1 - 0.06 * u
          return { geometry: ball(0.013, 6), position: [Math.cos(a) * r, 0.13 + u * 0.26, Math.sin(a) * r] as [number, number, number] }
        }),
        { geometry: ball(0.02, 6), position: [0, 0.43, 0] },
      ]),
    }
  }
  if (season === 'flowers') {
    const pots = [-0.14, 0, 0.14]
    return {
      body: merge(pots.map((x, i) => ({ geometry: new THREE.CylinderGeometry(0.045, 0.034, 0.07, 10), position: [x, 0.035, i * 0.02] }))),
      trim: merge(
        pots.flatMap((x, i) =>
          Array.from({ length: 4 }, (_, k) => {
            const a = k * 1.57 + i
            return { geometry: ball(0.018, 7), position: [x + Math.cos(a) * 0.022, 0.1 + (k % 2) * 0.025, i * 0.02 + Math.sin(a) * 0.022] as [number, number, number] }
          }),
        ),
      ),
    }
  }
  // sunflowers in a jug
  return {
    body: merge([
      { geometry: new THREE.CylinderGeometry(0.05, 0.042, 0.12, 12), position: [0, 0.06, 0] },
      ...Array.from({ length: 5 }, (_, i) => ({ geometry: cyl(0.006, 0.16, 5), position: [(i - 2) * 0.012, 0.17, 0] as [number, number, number], rotation: [0, 0, (i - 2) * 0.12] as [number, number, number] })),
    ]),
    trim: merge(
      Array.from({ length: 5 }, (_, i) => ({
        geometry: ball(0.025, 8),
        position: [(i - 2) * 0.032, 0.25 + (i % 2) * 0.02, 0] as [number, number, number],
        scale: [1, 1, 0.5] as [number, number, number],
      })),
    ),
  }
}

const SEASON_COLOURS: Record<Season, { body: string; trim: string }> = {
  pumpkins: { body: '#d8762e', trim: '#5d7a3f' },
  tree: { body: '#3f6b46', trim: '#d9b45a' },
  flowers: { body: '#c8724c', trim: '' },
  sunflowers: { body: '#5d7a3f', trim: '#e2b53c' },
}

function SeasonDecor({ season, room }: { season: Season; room: Room }) {
  const g = useMemo(() => seasonGeometry(season), [season])
  useEffect(
    () => () => {
      g.body.dispose()
      g.trim.dispose()
    },
    [g],
  )
  const colours = SEASON_COLOURS[season]
  const m = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color: colours.body, roughness: 0.85 }),
      trim: new THREE.MeshStandardMaterial({ color: colours.trim || accentFor(room), roughness: 0.75 }),
    }),
    [season, room.wallpaper], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  return (
    <group>
      <mesh castShadow receiveShadow geometry={g.body} material={m.body} />
      <mesh castShadow receiveShadow geometry={g.trim} material={m.trim} />
    </group>
  )
}

// ---------------------------------------------------------------------------

/**
 * All the cosy extras that stand in the room, placed from the bookcase's width
 * so none of them ever covers a book: the corner on the left, the plant and the
 * season's decorations at the right-hand foot.
 */
export function RoomExtras({
  room,
  caseWidth,
  night,
  stage,
  season,
  /** a phone: one extra light is never added (D-0045 §3) */
  lite,
}: {
  room: Room
  caseWidth: number
  night: boolean
  stage: PlantStage
  season: Season
  lite: boolean
}) {
  const side = caseWidth / 2
  const front = SHELF.depth / 2
  return (
    <>
      {/* the camera frames the whole case with only a hand's width of floor beside it, so the
          corner is tucked against the case's left shoulder: the lamp stands where it can be
          seen, and the chair's near arm and blanket come into the frame beside it */}
      {room.readingCorner && (
        <group position={[-side - 0.3, 0, front + 0.06]} rotation={[0, 0.5, 0]}>
          <ReadingCorner room={room} night={night} />
          {/* on a computer the lamp lights its corner at night; never on a phone */}
          {lampLightOn({ night, readingCorner: true, lite }) && <pointLight position={[LAMP[0], 1.14, LAMP[2]]} intensity={0.9} distance={2.2} decay={2} color="#ffd79a" />}
        </group>
      )}
      {room.plant && (
        <group position={[side + 0.14, 0, front + 0.04]}>
          <GrowingPlant stage={stage} room={room} />
        </group>
      )}
      {/* the season's pieces are low and stand on the strip of floor in front of the case's
          right-hand foot, so they are never in front of a spine */}
      {room.seasonal && (
        <group position={[side - 0.16, 0, front + 0.3]}>
          <SeasonDecor season={season} room={room} />
        </group>
      )}
    </>
  )
}
