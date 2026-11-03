import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book } from '#/lib/library'
import { timesRead } from '#/lib/library'
import type { BookDims, Slot } from '#/lib/shelfLayout'
import { METALS, medalFaceTexture, medalLayout, medalTier, pageTextures, paintBack, paintFallbackCover, paintSpine } from './textures'

export interface InspectTarget {
  rotY: number
  rotX: number
}

export interface BookMeshProps {
  book: Book
  /** paperclip colour, for books being read */
  clipColor?: string
  dims: BookDims
  slot: Slot
  selected: boolean
  dragging: boolean
  hovered: boolean
  dragPoint: RefObject<THREE.Vector3>
  inspect: RefObject<InspectTarget>
  /** where the camera sits (not the animated camera, the resting one) */
  cameraBase: THREE.Vector3
  fov: number
  /** fraction of the view height the inspected book fills, and how far up it sits */
  inspectFrame: { fill: number; yShift: number }
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
  onPointerMove: (e: ThreeEvent<PointerEvent>, id: string) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>, id: string) => void
  onHover: (id: string | null) => void
}

const SPINE_OUT = Math.PI / 2
const TAU = Math.PI * 2
const damp = THREE.MathUtils.damp
const smooth = THREE.MathUtils.smoothstep

/** Shift `angle` by whole turns so it is as close as possible to `ref`. */
export function nearestTurn(angle: number, ref: number) {
  return angle + Math.round((ref - angle) / TAU) * TAU
}

function useCoverTexture(url: string | undefined, bookAspect: number) {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) return
    let disposed = false
    let loaded: THREE.Texture | null = null
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        // centre-crop covers that are wider than the book (e.g. square audiobook art)
        const img = t.image as { width: number; height: number }
        const imgAspect = img.width / img.height
        if (imgAspect > bookAspect * 1.04) {
          t.repeat.x = bookAspect / imgAspect
          t.offset.x = (1 - t.repeat.x) / 2
        }
        if (disposed) return t.dispose()
        loaded = t
        setTex(t)
      },
      undefined,
      () => setTex(null),
    )
    return () => {
      disposed = true
      loaded?.dispose()
      setTex(null)
    }
  }, [url, bookAspect])
  return tex
}

export function BookMesh(props: BookMeshProps) {
  const {
    book,
    dims,
    slot,
    selected,
    dragging,
    hovered,
    dragPoint,
    inspect,
    cameraBase,
    fov,
    inspectFrame,
  } = props
  const group = useRef<THREE.Group>(null)

  // ---- textures ---------------------------------------------------------
  const cover = useCoverTexture(book.coverUrl, dims.w / dims.h)
  const painted = useMemo(
    () => ({
      spine: paintSpine(book, dims),
      back: paintBack(book, dims),
      fallback: paintFallbackCover(book, dims),
    }),
    // repaint only when something visible changes
    [book.title, book.authors.join(), book.color, book.status, book.description, book.isbn, book.pages, dims.w, dims.h, dims.t],
  )
  useEffect(
    () => () => {
      painted.spine.dispose()
      painted.back.dispose()
      painted.fallback.dispose()
    },
    [painted],
  )

  const materials = useMemo(() => {
    const pages = pageTextures()
    const paper = { roughness: 0.95, metalness: 0 }
    const coverMat = { roughness: 0.55, metalness: 0.02 }
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    // local frame: front cover +z, spine -x, fore-edge +x
    return [
      new THREE.MeshStandardMaterial({ map: pages.fore, ...paper }),
      new THREE.MeshStandardMaterial({ map: painted.spine, ...coverMat }),
      new THREE.MeshStandardMaterial({ map: pages.topBottom, ...paper }),
      new THREE.MeshStandardMaterial({ map: pages.topBottom, ...paper }),
      new THREE.MeshStandardMaterial({ map: cover ?? painted.fallback, ...coverMat }),
      new THREE.MeshStandardMaterial({ map: painted.back, ...coverMat }),
    ]
  }, [painted, cover])
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  // ---- animation --------------------------------------------------------
  const anim = useRef({
    shelf: new THREE.Vector3(slot.x, slot.y, slot.z),
    drag: new THREE.Vector3(slot.x, slot.y, slot.z),
    dragAmt: 0,
    hover: 0,
    progress: 0,
    rotY: SPINE_OUT,
    rotX: 0,
    wasSelected: false,
  })
  const tmp = useMemo(() => ({ base: new THREE.Vector3(), target: new THREE.Vector3() }), [])

  useFrame((_, rawDt) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05)
    const a = anim.current

    damp3(a.shelf, slot.x, slot.y, slot.z, 9, dt)
    if (dragging) a.drag.lerp(dragPoint.current, 1 - Math.exp(-25 * dt))
    else a.drag.copy(a.shelf)
    a.dragAmt = damp(a.dragAmt, dragging ? 1 : 0, 12, dt)
    a.hover = damp(a.hover, hovered && !dragging && !selected ? 1 : 0, 12, dt)
    a.progress = damp(a.progress, selected ? 1 : 0, selected ? 3.2 : 4.5, dt)

    if (selected) {
      a.rotY = damp(a.rotY, inspect.current.rotY, 7, dt)
      a.rotX = damp(a.rotX, inspect.current.rotX, 7, dt)
    } else {
      if (a.wasSelected) a.rotY = nearestTurn(a.rotY, SPINE_OUT)
      a.rotY = damp(a.rotY, SPINE_OUT, 6, dt)
      a.rotX = damp(a.rotX, 0, 6, dt)
    }
    a.wasSelected = selected

    // pulled straight out of the shelf first, then flown to the camera
    const p = a.progress
    const out = smooth(p, 0, 0.35)
    const fly = smooth(p, 0.2, 1)
    tmp.base.lerpVectors(a.shelf, a.drag, a.dragAmt)
    tmp.base.z += 0.035 * a.hover + 0.28 * out
    tmp.base.y += 0.01 * a.hover

    // distance at which the book fills `fill` of the view height
    const tan = Math.tan(THREE.MathUtils.degToRad(fov / 2))
    const dist = dims.h / (2 * tan * inspectFrame.fill)
    const viewHeight = 2 * dist * tan
    tmp.target.set(cameraBase.x, cameraBase.y + viewHeight * inspectFrame.yShift, cameraBase.z - dist)
    g.position.lerpVectors(tmp.base, tmp.target, fly)

    g.rotation.set(
      a.rotX * fly,
      THREE.MathUtils.lerp(SPINE_OUT, a.rotY, fly),
      -0.12 * a.dragAmt,
    )
  })

  return (
    <group ref={group} position={[slot.x, slot.y, slot.z]} rotation={[0, SPINE_OUT, 0]}>
      <mesh
        castShadow
        receiveShadow
        material={materials}
        onPointerDown={(e) => props.onPointerDown(e, book.id)}
        onPointerMove={(e) => props.onPointerMove(e, book.id)}
        onPointerUp={(e) => props.onPointerUp(e, book.id)}
        onPointerOver={(e) => {
          e.stopPropagation()
          props.onHover(book.id)
        }}
        onPointerOut={() => props.onHover(null)}
      >
        <boxGeometry args={[dims.w, dims.h, dims.t]} />
      </mesh>
      {book.status === 'reading' && (
        <Bookmark dims={dims} progress={book.progress ?? 0} color={props.clipColor ?? RAINBOW[0]} />
      )}
      {book.status === 'read' && <Medal dims={dims} count={timesRead(book)} />}
    </group>
  )
}

function damp3(v: THREE.Vector3, x: number, y: number, z: number, lambda: number, dt: number) {
  v.set(damp(v.x, x, lambda, dt), damp(v.y, y, lambda, dt), damp(v.z, z, lambda, dt))
}

// ---------------------------------------------------------------------------
// Bookmark: a large coated paperclip clipped onto the page you are on. It
// stands upright in the plane of the pages and pokes out of the top edge, so
// from the shelf it reads as a pin sticking up at the reading position.
// ---------------------------------------------------------------------------

/** Paperclip colours, handed out in order to the books being read. */
export const RAINBOW = ['#e5484d', '#f2843a', '#f5c842', '#4fb365', '#3d8fe0', '#5b5bd6', '#a35bd0']

const CLIP = {
  width: 0.02,
  height: 0.07,
  wire: 0.0015, // tube radius
  out: 0.042, // how far it sticks out above the pages
  fromSpine: 0.012, // gap between the spine and the clip's outer leg
}

/**
 * Gem-style paperclip as one continuous wire, in units of the clip width.
 * Legs at x = +0.2, -0.3, +0.5, -0.5 joined by three U-turns.
 */
function paperclipPoints(width: number, height: number) {
  const hgt = height / width
  const pts: THREE.Vector3[] = []
  const line = (x: number, y0: number, y1: number) => {
    const n = Math.max(2, Math.ceil(Math.abs(y1 - y0) * 6))
    for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(x, y0 + ((y1 - y0) * i) / n, 0))
  }
  // half-turn from angle a0 to a1 round (cx, cy)
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
    const n = 14
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n
      pts.push(new THREE.Vector3(cx + r * Math.cos(a), cy + r * Math.sin(a), 0))
    }
  }
  const outerTop = hgt - 0.5
  const innerTop = outerTop - 0.32
  line(0.2, 0.95, innerTop) // innermost leg, up
  arc(-0.05, innerTop, 0.25, 0, Math.PI) // small top turn
  line(-0.3, innerTop, 0.4) // down
  arc(0.1, 0.4, 0.4, Math.PI, TAU) // wide bottom turn
  line(0.5, 0.4, outerTop) // up the outside
  arc(0, outerTop, 0.5, 0, Math.PI) // big top turn
  line(-0.5, outerTop, 0.75) // down the outside, ending short
  pts.push(new THREE.Vector3(-0.5, 0.75, 0))
  return pts.map((p) => p.multiplyScalar(width))
}

function paperclipGeometry() {
  const curve = new THREE.CatmullRomCurve3(paperclipPoints(CLIP.width, CLIP.height), false, 'centripetal')
  return new THREE.TubeGeometry(curve, 220, CLIP.wire, 8, false)
}

function Bookmark({
  dims,
  progress,
  color,
}: {
  dims: BookDims
  progress: number
  color: string
}) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(paperclipGeometry, [])
  const material = useMemo(
    // plastic-coated wire: glossy with a hint of metal
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.25 }),
    [color],
  )
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  // local frame: front cover at +z, back cover at -z; page 1 sits just behind the front cover
  const inset = CLIP.wire + 0.003
  const span = Math.max(0, dims.t / 2 - inset)
  const targetZ = THREE.MathUtils.lerp(span, -span, THREE.MathUtils.clamp(progress, 0, 1))
  // clip's outer leg near the spine, top poking out above the pages
  const x = -dims.w / 2 + CLIP.fromSpine + CLIP.width / 2
  const y = dims.h / 2 + CLIP.out - CLIP.height

  useFrame((_, dt) => {
    const g = group.current
    if (g) g.position.z = THREE.MathUtils.damp(g.position.z, targetZ, 8, Math.min(dt, 0.05))
  })

  return (
    <group ref={group} position={[0, 0, targetZ]}>
      <mesh castShadow geometry={geometry} material={material} position={[x, y, 0]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Medal: a bronze, silver or gold medal (read once, twice, three times or more) pinned to the bottom of the spine of a finished book.
// Its ribbon is painted on the spine texture (see paintSpine); the medal
// itself is a thin gold disc standing just proud of the spine.
// ---------------------------------------------------------------------------

const MEDAL_DEPTH = 0.0018

const medalMaterials = new Map<string, { face: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial }>()
function getMedalMaterials(count: number) {
  // shared by every medal with the same metal and number, never disposed
  const tier = medalTier(count)
  const key = `${tier}:${count}`
  let mats = medalMaterials.get(key)
  if (!mats) {
    mats = {
      face: new THREE.MeshStandardMaterial({
        map: medalFaceTexture(tier, count),
        metalness: 0.55,
        roughness: 0.32,
        emissive: METALS[tier].dark,
        emissiveIntensity: 0.25,
      }),
      rim: new THREE.MeshStandardMaterial({ color: METALS[tier].rim, metalness: 0.7, roughness: 0.3 }),
    }
    medalMaterials.set(key, mats)
  }
  return mats
}

function Medal({ dims, count }: { dims: BookDims; count: number }) {
  const { r, fromBottom } = medalLayout(dims)
  const mats = getMedalMaterials(count)
  return (
    // spine is the -x face; the disc faces outwards along -x
    <group position={[-dims.w / 2, -dims.h / 2 + fromBottom, 0]}>
      <mesh castShadow material={mats.rim} position={[-MEDAL_DEPTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r, r, MEDAL_DEPTH, 40, 1, true]} />
      </mesh>
      <mesh material={mats.face} position={[-MEDAL_DEPTH, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[r, 40]} />
      </mesh>
    </group>
  )
}
