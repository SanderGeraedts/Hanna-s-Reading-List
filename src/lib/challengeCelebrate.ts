/**
 * When a finished challenge is celebrated (D-0064 §4). The device remembers
 * which challenges it has already celebrated, exactly as `BadgeToasts` keeps
 * `badges-shown`: the first time a device sees no memory at all it records
 * everything and celebrates nothing, so a year of finished challenges does not
 * explode on her screen.
 *
 * However many challenges became complete at once, there is **one** burst.
 */

export interface Celebration {
  /** fire the confetti */
  burst: boolean
  /** what the device must remember from now on */
  remember: string[]
}

/**
 * @param complete every complete challenge now, as `<year>:<id>`
 * @param seen what this device has already celebrated, or null on its first run
 */
export function toCelebrate(complete: readonly string[], seen: readonly string[] | null): Celebration {
  // a challenge that stops being complete stays remembered, so finishing it
  // again (she raised the goal and lowered it) is not celebrated twice
  const remember = [...new Set([...(seen ?? []), ...complete])].sort()
  if (seen === null) return { burst: false, remember }
  const known = new Set(seen)
  return { burst: complete.some((id) => !known.has(id)), remember }
}
