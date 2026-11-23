import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { speciesById } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import type { Mood } from '#/lib/creatures/creature'
import { makeCreature } from './models'
import type { CreatureQuality, CreatureStage } from './model'

/**
 * What the den, the choose step and the dashboard block share (T-0029
 * Design §6, §7, §12): one built creature per species, stage, palette and
 * quality (built once, then cloned: the clones share geometry and the four
 * shared materials), the parts an animation moves, and the page hooks that
 * decide how much may move.
 */

const cache = new Map<string, THREE.Group>()

/** A creature to put in a scene: built once per species, stage, palette and quality, cloned for each use. */
export function creatureFor(species: SpeciesId, stage: CreatureStage, shiny: boolean, quality: CreatureQuality): THREE.Group {
  const key = `${species}|${stage}|${shiny ? 1 : 0}|${quality}`
  let built = cache.get(key)
  if (!built) {
    const s = speciesById(species)
    built = makeCreature(species, { stage, quality, palette: shiny ? s.shinyPalette : s.palette })
    cache.set(key, built)
  }
  return built.clone(true)
}

/** The parts an animation moves, with the scale and rotation they were built with. */
export interface Rig {
  root: THREE.Group
  body?: THREE.Object3D
  head?: THREE.Object3D
  eyes?: THREE.Object3D
  base: { body: THREE.Vector3; head: THREE.Euler; eyes: THREE.Vector3 }
  /** height in model units, for framing */
  height: number
}

export function rigOf(root: THREE.Group): Rig {
  const body = root.getObjectByName('part:body')
  const head = root.getObjectByName('part:head')
  const eyes = root.getObjectByName('part:eyes')
  const box = new THREE.Box3().setFromObject(root, true)
  return {
    root,
    body,
    head,
    eyes,
    base: {
      body: body ? body.scale.clone() : new THREE.Vector3(1, 1, 1),
      head: head ? head.rotation.clone() : new THREE.Euler(),
      eyes: eyes ? eyes.scale.clone() : new THREE.Vector3(1, 1, 1),
    },
    height: Math.max(0.1, box.max.y - box.min.y),
  }
}

/** How open the eyes are (scale y of `part:eyes`) for a mood: half shut when missing her, almost shut when sleepy. */
export function eyeOpen(mood: Mood | null): number {
  return mood === 'missing' ? 0.5 : mood === 'sleepy' ? 0.2 : 1
}

/** The head's tilt for a mood, in radians: tipped down 8° when missing her, 6° sideways when sleepy. */
export function headTilt(mood: Mood | null): { x: number; z: number } {
  return mood === 'missing' ? { x: (8 * Math.PI) / 180, z: 0 } : mood === 'sleepy' ? { x: 0, z: (6 * Math.PI) / 180 } : { x: 0, z: 0 }
}

/** Puts a creature in a still pose for a mood: eyes and head (the block's picture never moves). */
export function poseStill(rig: Rig, mood: Mood | null) {
  if (rig.eyes) rig.eyes.scale.set(rig.base.eyes.x, rig.base.eyes.y * eyeOpen(mood), rig.base.eyes.z)
  if (rig.head) {
    const t = headTilt(mood)
    rig.head.rotation.set(rig.base.head.x + t.x, rig.base.head.y, rig.base.head.z + t.z)
  }
}

// ---- page hooks -------------------------------------------------------------------------

/** False while the page is hidden (another app, a locked phone): every scene stops then. */
export function usePageVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const on = () => setVisible(!document.hidden)
    on()
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return visible
}

function useMedia(query: string) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const m = window.matchMedia(query)
    const set = () => setOn(m.matches)
    set()
    m.addEventListener('change', set)
    return () => m.removeEventListener('change', set)
  }, [query])
  return on
}

/** A phone (Design §12): 720 px or narrower, or a finger for a pointer. */
export const usePhone = () => useMedia('(max-width: 720px), (pointer: coarse)')

/** Reduce motion is on: nothing idles, hops or bobs; the crack is a fade. */
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')

/** Whether this browser can draw 3D at all; without it the den card is left out (Design §5). */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
