/**
 * Keeping the app on her phone, so it opens at once and works with no signal
 * (D-0089).
 *
 * The service worker was only ever registered when she turned the reading
 * reminder on (#163), so for everyone else it did nothing. Registering it on
 * every visit is what makes `public/sw.js`'s caching real: the built files
 * (whose names carry their contents) are kept, and the page itself is fetched
 * from the network first so a new version is never held back.
 *
 * It is registered **after the page has loaded**, so it never competes with the
 * shelf for the connection on the first visit.
 */

/** Whether this browser can keep the app at all. */
export const canKeepApp = (): boolean => typeof navigator !== 'undefined' && 'serviceWorker' in navigator

/**
 * Registers the worker once the page is quiet. Answers what happened, so a test
 * can see it; a browser that refuses (a private window, a blocked origin) simply
 * carries on — the app has never needed it.
 */
export async function keepAppOnThisDevice(nav: Pick<Navigator, 'serviceWorker'> | undefined = globalThis.navigator): Promise<
  'kept' | 'unsupported' | 'refused'
> {
  if (!nav || !('serviceWorker' in nav)) return 'unsupported'
  try {
    await nav.serviceWorker.register('/sw.js')
    return 'kept'
  } catch {
    return 'refused'
  }
}
