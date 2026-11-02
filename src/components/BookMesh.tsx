import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Book } from '#/lib/library'
import type { BookDims, Slot } from '#/lib/shelfLayout'
import { pageTextures, paintBack, paintFallbackCover, paintSpine } from './textures'

export interface InspectTarget {
  rotY: number
  rotX: number
}

export interface BookMeshProps {
  book: Book
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
    [book.title, book.authors.join(), book.color, book.description, book.isbn, book.pages, dims.w, dims.h, dims.t],
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
    </group>
  )
}

function damp3(v: THREE.Vector3, x: number, y: number, z: number, lambda: number, dt: number) {
  v.set(damp(v.x, x, lambda, dt), damp(v.y, y, lambda, dt), damp(v.z, z, lambda, dt))
}
