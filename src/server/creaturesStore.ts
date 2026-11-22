import { cleanLog } from '#/lib/creatures/choices'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { PocketBaseError, pb } from './pocketbase'

/**
 * Reading and adding to her creature choices (D-0034) on the account's
 * `libraries` record. Server only: the server functions in creatures.ts call
 * these. The log is only ever added to, through the route of T-0028
 * (pb_hooks/creatures.pb.js); the field is never PATCHed (D-0034).
 */

/** `kept: false`: no shelf on the server yet, or the server doesn't keep creatures (yet): the device keeps its own. */
export type AccountCreatures = { kept: true; events: ChoiceEvent[] } | { kept: false }

const NOT_KEPT: AccountCreatures = { kept: false }

interface Row {
  id: string
  creatures?: unknown
}

export async function readCreatures(token: string): Promise<AccountCreatures> {
  // only the creatures, not the whole shelf
  const list = await pb<{ items: Row[] }>('/api/collections/libraries/records?perPage=1&skipTotal=1&fields=id,creatures', { token })
  const row = list.items[0]
  // a server older than the field leaves it out of the answer (a field never set comes back as null)
  if (!row || !Object.hasOwn(row, 'creatures')) return NOT_KEPT
  return { kept: true, events: cleanLog(row.creatures) }
}

/**
 * Adds events to the account's log. The route adds the ids it hasn't got in
 * one transaction and answers with the whole log; a server without the field
 * or the route, or an account without a shelf yet, answers 404: nothing written.
 */
export async function addCreatures(token: string, events: ChoiceEvent[]): Promise<AccountCreatures> {
  try {
    const saved = await pb<{ creatures?: unknown }>('/api/collections/libraries/creatures', {
      method: 'POST',
      token,
      body: { events },
    })
    return { kept: true, events: cleanLog(saved.creatures) }
  } catch (err) {
    if (err instanceof PocketBaseError && err.status === 404) return NOT_KEPT
    throw err
  }
}
