import { createServerFn } from '@tanstack/react-start'
import { MAX_PER_CALL, cleanLog } from '#/lib/creatures/choices'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { addCreatures, readCreatures, type AccountCreatures } from './creaturesStore'
import { asUser } from './pocketbase'

/**
 * Her creature choices on the account (D-0034, T-0029): read with the
 * record list (`fields=id,creatures`) and added to through the server's own
 * route (T-0028), never as part of a shelf save. Until the server keeps them
 * (or when it answers 404) both answer `kept: false` and each device keeps
 * its own log, so the game works the same with or without it.
 *
 * Kept apart from shelf.ts (a code-owner path) on purpose.
 */

export type { AccountCreatures }

/** The account's log, or `kept: false` when the device should keep its own. */
export const loadCreatures = createServerFn({ method: 'GET' }).handler(
  (): Promise<AccountCreatures> => asUser((token) => readCreatures(token)),
)

/** Adds events the account hasn't got; answers with the whole log as saved. */
export const saveCreatures = createServerFn({ method: 'POST' })
  .validator((input: { events?: unknown }): { events: ChoiceEvent[] } => {
    const events = Array.isArray(input?.events) ? input.events : []
    if (events.length > MAX_PER_CALL) throw new Error('Too many creature choices at once.')
    return { events: cleanLog(events) }
  })
  .handler(({ data }): Promise<AccountCreatures> => asUser((token) => addCreatures(token, data.events)))
