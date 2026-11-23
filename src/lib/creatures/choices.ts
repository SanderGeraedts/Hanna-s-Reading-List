import { isSpeciesId } from './species'
import type { SpeciesId } from './species'

/**
 * Her creature choices as a log of events that only grows (D-0034): kept on
 * the device, and on the account once the server keeps them (T-0028). Each
 * event has a unique id made on the device. Setting kinds (here: `name`)
 * carry a `key`, and per kind and key only the newest `at` counts (on a tie
 * the larger id); everything else counts once per id. The same rules as the
 * server's route (deploy/nas/pb_hooks/creatures.pb.js), so a device and the
 * account always agree on what a log means.
 *
 * T-0029 writes three kinds: `hatch` (the welcome egg, with the creature she
 * chose), `name` and `feed`. Kinds this version doesn't know yet (from a newer
 * device) are kept as they are and passed on, never dropped.
 */

export interface HatchEvent {
  id: string
  at: number
  kind: 'hatch'
  /** the egg's id; the pet's id is the egg's id */
  egg: string
  /** for the welcome egg: the creature she chose (D-0033 §3) */
  species: SpeciesId
}

export interface NameEvent {
  id: string
  at: number
  kind: 'name'
  /** the pet's id */
  key: string
  name: string
}

export interface FeedEvent {
  id: string
  at: number
  kind: 'feed'
  pet: string
  /** cookies given, one feed or a few quick taps together */
  amount: number
}

/** An event of a kind this version doesn't use (yet): kept and passed on. */
export interface OtherEvent {
  id: string
  at: number
  kind: string
  [field: string]: string | number
}

export type ChoiceEvent = HatchEvent | NameEvent | FeedEvent | OtherEvent

/** The kinds the server's route knows (T-0028); anything else it drops, so the device does too. */
export const KINDS = ['hatch', 'choose', 'release', 'name', 'feed', 'buy', 'wear', 'place', 'habitat', 'current', 'shelf'] as const
/** Kinds where the newest event per key wins. */
export const SETTING_KINDS: readonly string[] = ['name', 'wear', 'place', 'habitat', 'current', 'shelf']

/** Limits of the server's route: an event's id, field names, string length and field count. */
const ID = /^[A-Za-z0-9:_-]{1,60}$/
const FIELD = /^[A-Za-z][A-Za-z0-9_]{0,29}$/
const MAX_STRING = 60
const MAX_FIELDS = 12
/** At most this many events per call to the route. */
export const MAX_PER_CALL = 200

/** A hatch this version can read: an egg and a known creature. */
export const isHatch = (e: ChoiceEvent): e is HatchEvent =>
  e.kind === 'hatch' && typeof e.egg === 'string' && isSpeciesId((e as { species?: unknown }).species)
/** A name this version can read: a name that isn't empty. */
export const isName = (e: ChoiceEvent): e is NameEvent =>
  e.kind === 'name' && typeof e.key === 'string' && typeof e.name === 'string' && e.name.trim() !== ''
/** A feed this version can read: a pet and more than 0 cookies. */
export const isFeed = (e: ChoiceEvent): e is FeedEvent =>
  e.kind === 'feed' && typeof e.pet === 'string' && typeof e.amount === 'number' && e.amount > 0

/** One event made safe, or null: the same shape checks as the server's route. */
export function cleanEvent(raw: unknown): ChoiceEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const x = raw as Record<string, unknown>
  if (typeof x.id !== 'string' || !ID.test(x.id)) return null
  if (typeof x.at !== 'number' || !Number.isFinite(x.at)) return null
  if (typeof x.kind !== 'string' || !(KINDS as readonly string[]).includes(x.kind)) return null
  const keys = Object.keys(x)
  if (keys.length > MAX_FIELDS) return null
  const out: Record<string, string | number> = {}
  for (const k of keys) {
    const v = x[k]
    if (!FIELD.test(k)) return null
    if (typeof v === 'string') {
      if (v.length > MAX_STRING) return null
    } else if (typeof v !== 'number' || !Number.isFinite(v)) return null
    out[k] = v
  }
  if (SETTING_KINDS.includes(x.kind) && (typeof x.key !== 'string' || x.key === '')) return null
  // kept even when this version can't read it (a later egg's hatch may carry other fields): the
  // readers below check the fields they need
  return out as unknown as ChoiceEvent
}

/** A saved log made safe: well-formed events, each id once (the first one seen). */
export function cleanLog(raw: unknown): ChoiceEvent[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: ChoiceEvent[] = []
  for (const x of raw) {
    const e = cleanEvent(x)
    if (e && !seen.has(e.id)) {
      seen.add(e.id)
      out.push(e)
    }
  }
  return out
}

const newer = (a: ChoiceEvent, b: ChoiceEvent) => a.at > b.at || (a.at === b.at && a.id > b.id)
const slot = (e: ChoiceEvent) => (SETTING_KINDS.includes(e.kind) ? `${e.kind}\n${(e as NameEvent).key}` : null)

/**
 * Two logs as one (D-0034 §5): a union by id (nothing doubled; an event
 * already there is never changed), then per setting kind and key only the
 * newest. Sorted by time, then id, so every device lists it the same way.
 */
export function mergeLogs(...logs: ReadonlyArray<readonly ChoiceEvent[]>): ChoiceEvent[] {
  const byId = new Map<string, ChoiceEvent>()
  for (const log of logs) for (const e of log) if (!byId.has(e.id)) byId.set(e.id, e)
  const best = new Map<string, ChoiceEvent>()
  for (const e of byId.values()) {
    const s = slot(e)
    if (s !== null && (!best.has(s) || newer(e, best.get(s)!))) best.set(s, e)
  }
  return [...byId.values()]
    .filter((e) => {
      const s = slot(e)
      return s === null || best.get(s) === e
    })
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** A new event id: the kind, the time and a random tail, unique enough across her devices. */
export function newEventId(kind: string, at: number, random: () => number = Math.random): string {
  const tail = Math.floor(random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0')
  return `${kind}-${at.toString(36)}-${tail}`
}
