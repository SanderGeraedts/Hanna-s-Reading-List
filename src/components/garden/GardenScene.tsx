import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { YearGarden } from '#/lib/garden/garden'
import { DETAILED_PLANTS } from '#/lib/garden/numbers'
import type { Season } from '#/lib/garden/seasons'
import { SCENE_ELEVATION, gardenLayout, slotPoint, spotPoint } from '#/lib/garden/view'
import { itemSlotsFor } from '#/lib/garden/numbers'
import { usePageVisible } from '../creatures/pose'
import { buildBeds, buildGround, buildItem, buildPlant, buildPlantField, buildShadows, buildVisitors, buildWeather, lookOf } from './plantModel'
import { sceneColumns, sceneView, NOMINAL_W } from './gardenView'

/**
 * The cosy 3D garden (T-0062): the same garden as the flat view, seen from a
 * fixed low angle through an orthographic camera — which is what lets the spot
 * buttons sit exactly over the plants, because the view's own arithmetic
 * (`sceneView`) and the camera agree.
 *
 * The scene is built once per garden and season and then only moved: nothing is
 * rebuilt while a bee flies. It stops rendering when the page is hidden or
 * something is over it, like the den.
 */

export interface GardenSceneProps {
  year: YearGarden
  season: Season
  /** after dark: moonlight instead of sun, and the night-bloomers show (D-0071) */
  night?: boolean
  reduce?: boolean
  /** something is over the page: stop rendering */
  paused?: boolean
}

export function GardenScene({ year, season, night, reduce, paused }: GardenSceneProps) {
  const columns = sceneColumns(year.beds)
  const layout = useMemo(() => gardenLayout(year.beds, columns), [year.beds, columns])
  const view = useMemo(() => sceneView(layout), [layout])
  const target = useMemo(() => new THREE.Vector3(layout.width / 2, 0, layout.depth / 2), [layout])
  return (
    <Canvas
      className="garden-canvas"
      aria-hidden="true"
      tabIndex={-1}
      orthographic
      shadows={false}
      dpr={[1, 2]}
      camera={{ position: [target.x, 6, target.z + 6], near: -50, far: 100, zoom: 40 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Rig target={target} scale={view.scale} />
      {night ? (
        <>
          <hemisphereLight args={['#aebbe6', '#1d2231', 0.5]} />
          <ambientLight intensity={0.22} color="#9fb0dd" />
          {/* the moon, low and cool, and a last warm glow from the house */}
          <directionalLight position={[-4, 7, 4]} intensity={0.75} color="#c3cff2" />
          <directionalLight position={[3, 4, -5]} intensity={0.25} color="#e8c58a" />
        </>
      ) : (
        <>
          <hemisphereLight args={['#ffe8cc', '#4a3a2a', 1.15]} />
          <ambientLight intensity={0.3} color="#ffdcb4" />
          <directionalLight position={[-4, 7, 4]} intensity={1.7} color="#ffdcae" />
          <directionalLight position={[3, 4, -5]} intensity={0.4} color="#e8e4ff" />
        </>
      )}
      <Garden year={year} season={season} reduce={reduce} paused={paused} />
    </Canvas>
  )
}

/** The orthographic camera, pointed at the garden from the view's own angle. */
function Rig({ target, scale }: { target: THREE.Vector3; scale: number }) {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    const dist = 30
    cam.position.set(target.x, Math.sin(SCENE_ELEVATION) * dist, target.z + Math.cos(SCENE_ELEVATION) * dist)
    cam.up.set(0, 1, 0)
    cam.lookAt(target)
    // the same pixels-per-unit the spot buttons are placed with
    cam.zoom = (size.width / NOMINAL_W) * scale
    cam.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, target, scale, invalidate])
  return null
}

function Garden({ year, season, reduce, paused }: GardenSceneProps) {
  const visible = usePageVisible()
  const columns = sceneColumns(year.beds)
  const layout = useMemo(() => gardenLayout(year.beds, columns), [year.beds, columns])
  const { invalidate, scene } = useThree()
  const group = useRef<THREE.Group>(null)
  const visitors = useRef<THREE.Points | null>(null)
  const weather = useRef<THREE.Points | null>(null)
  const sway = useRef<THREE.Object3D[]>([])

  // built once per garden and season
  const built = useMemo(() => {
    const root = new THREE.Group()
    root.add(buildGround(layout, season))
    root.add(buildBeds(layout, season))
    const shadows: Array<{ x: number; z: number; r: number }> = []
    const swaying: THREE.Object3D[] = []
    // the plants nearest the front are the detailed ones; the rest are the simplest shape of
    // their family, so a hundred plants stay inside the budget (T-0062 §4)
    const order = [...year.plants].sort((a, b) => b.bed - a.bed || b.spot - a.spot)
    const field: Array<{ look: ReturnType<typeof lookOf>; x: number; z: number }> = []
    order.forEach((p, i) => {
      const at = spotPoint(layout, p.bed, p.spot)
      shadows.push({ x: at.x, z: at.z, r: 0.3 + p.scale * 0.25 })
      if (i < DETAILED_PLANTS) {
        // the plants at the front: their own mesh, so they can sway
        const mesh = buildPlant(lookOf(p, season), 'high')
        mesh.position.set(at.x, 0.13, at.z)
        root.add(mesh)
        swaying.push(mesh)
      } else {
        // everything behind them: the simplest shape of its family, all in one mesh
        field.push({ look: lookOf(p, season, true), x: at.x, z: at.z })
      }
    })
    const behind = buildPlantField(field)
    if (behind) root.add(behind)
    root.add(buildShadows(shadows))
    for (const [item, slot] of year.items) {
      const at = slotPoint(layout, slot, itemSlotsFor(year.beds))
      const mesh = buildItem(item, season)
      mesh.position.set(at.x, 0, at.z)
      root.add(mesh)
    }
    const guests: Array<{ x: number; y: number; z: number; colour: string }> = []
    const push = (n: number, colour: string, y: number) => {
      for (let i = 0; i < n; i++)
        guests.push({ x: layout.width * (0.2 + ((guests.length * 0.23) % 0.6)), y, z: layout.depth * (0.2 + ((guests.length * 0.31) % 0.6)), colour })
    }
    push(year.visitors.bees, '#e2c05a', 1.1)
    push(year.visitors.butterflies, '#e4a0c8', 1.3)
    push(year.visitors.birds, '#8d7f9c', 1.6)
    const flyers = buildVisitors(guests)
    if (flyers) root.add(flyers)
    // falling leaves and snow only when motion is welcome and the garden is not already full
    const sky = reduce || year.plants.length > 60 ? null : buildWeather(layout, season)
    if (sky) root.add(sky)
    return { root, flyers, sky, swaying }
  }, [layout, season, year, reduce])

  useLayoutEffect(() => {
    const g = group.current
    if (!g) return
    g.clear()
    g.add(built.root)
    visitors.current = built.flyers
    weather.current = built.sky
    sway.current = built.swaying
    invalidate()
    return () => {
      g.clear()
    }
  }, [built, invalidate, scene])

  useFrame((state, delta) => {
    if (reduce || paused || !visible) return
    const t = state.clock.elapsedTime
    for (const [i, mesh] of sway.current.entries()) mesh.rotation.z = Math.sin(t * 0.7 + i) * 0.02
    const flyers = visitors.current
    if (flyers) {
      const pos = flyers.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        pos.setX(i, pos.getX(i) + Math.sin(t * 0.6 + i) * delta * 0.4)
        pos.setZ(i, pos.getZ(i) + Math.cos(t * 0.5 + i * 1.7) * delta * 0.4)
        pos.setY(i, pos.getY(i) + Math.sin(t * 1.3 + i) * delta * 0.1)
      }
      pos.needsUpdate = true
    }
    const sky = weather.current
    if (sky) {
      const pos = sky.geometry.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) - delta * 0.35
        pos.setY(i, y < 0 ? 4 : y)
      }
      pos.needsUpdate = true
    }
  })

  return <group ref={group} />
}
