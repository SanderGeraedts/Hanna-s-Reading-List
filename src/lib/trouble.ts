import type { SyncStatus } from './library'
import { NOT_SIGNED_IN } from './signedOut'

/**
 * What the app says when something goes wrong (D-0088, T-0116).
 *
 * Every failure Hanna can notice gets one honest line in three parts: **what
 * happened**, **whether her books are safe**, and **what she can do**. No stack
 * traces, no jargon, no pop-ups (D-0013): the line sits where the thing is, or
 * in "Waiting for you".
 *
 * Her shelf is written to this browser's storage before anything is sent, so
 * "safe on this device" is true — unless the browser refuses to store (private
 * mode, storage full). `deviceKeeps` carries that, and the safe sentence
 * changes when it is false: the app never claims a safety it hasn't got.
 *
 * Nothing here ever offers to repair her books. If her reading looks wrong or
 * missing, that is Sander's (the guardrails): the line says so.
 */

export type TroubleKind =
  /** changes made here have not reached the server at Sander's home */
  | 'shelf-not-sent'
  /** the shelf is too large to send in one go (usually cover photos) */
  | 'shelf-too-big'
  /** the server no longer accepts this device's sign-in */
  | 'signed-out'
  /** the 3D bookshelf cannot be drawn on this screen */
  | 'shelf-not-drawn'
  /** the Storytel refresh did not come back the way the app expects */
  | 'storytel-refresh'
  /** Storytel no longer accepts the login saved on this device */
  | 'storytel-signed-out'
  /** her reading goal is on this device but has not reached the server */
  | 'goal-not-sent'
  /** one of her own challenges is on this device but has not reached the server */
  | 'challenge-not-sent'
  /** books or reading look wrong or missing: Sander's, never ours to repair */
  | 'books-look-wrong'

export interface TroubleLine {
  /** what happened, in one sentence */
  what: string
  /** what it means for her books; never a claim the app can't stand behind */
  safe: string
  /** the way forward: try again, carry on without it, or tell Sander */
  fix: string
  /** the label for a Try again button, or null when trying again cannot help */
  retry: string | null
  /** true when this one is genuinely Sander's and the line says so */
  sander: boolean
}

export interface TroubleWhere {
  /**
   * whether this browser is keeping a copy of her shelf. False in a private
   * window or with storage full: then nothing may be claimed as safe here.
   */
  deviceKeeps?: boolean
}

/** Said when the browser cannot keep a copy either: the one case where nothing is safe yet. */
const NOT_KEPT_HERE =
  "This browser isn't keeping a copy either — it's full, or it's a private window — so what you change now lives only in this tab."

const SAFE_HERE = 'Your books are safe on this device; they just haven’t reached the server at Sander’s home yet.'

const LINES: Record<TroubleKind, TroubleLine> = {
  'shelf-not-sent': {
    what: 'Your latest changes haven’t reached the server at Sander’s home.',
    safe: SAFE_HERE,
    fix: 'Carry on reading and adding books — the app keeps trying on its own. Try again to send them now. If it still says this tomorrow, tell Sander.',
    retry: 'Try again',
    sander: false,
  },
  'shelf-too-big': {
    what: 'Your shelf has grown too big to send in one go — usually the cover photos you took yourself.',
    safe: 'Your books are safe on this device, but nothing new is reaching the server at Sander’s home until it fits.',
    fix: 'Removing a few of your own cover photos makes it fit again. If that doesn’t help, tell Sander.',
    retry: null,
    sander: false,
  },
  'signed-out': {
    what: 'You’ve been signed out.',
    safe: 'Your books are safe on this device.',
    fix: 'Sign in again to pick up where you left off.',
    retry: null,
    sander: false,
  },
  'shelf-not-drawn': {
    what: 'The bookshelf can’t be drawn on this screen right now.',
    safe: 'Your books are safe. The Dashboard, Challenges and Calendar still work.',
    fix: 'Try again, or switch to simple books — they’re much lighter to draw.',
    retry: 'Try again',
    sander: false,
  },
  'storytel-refresh': {
    what: 'Storytel didn’t answer the way the app expects.',
    safe: 'Your books are safe — nothing on your shelf was changed.',
    fix: 'Carry on without it and try the refresh again later. Storytel changes things now and then; if it keeps failing, tell Sander.',
    retry: 'Try again',
    sander: true,
  },
  'storytel-signed-out': {
    what: 'Storytel no longer accepts the login saved on this device.',
    safe: 'Your books are safe — nothing on your shelf was changed.',
    fix: 'Sign in to Storytel again to keep refreshing from it, or carry on without it.',
    retry: null,
    sander: false,
  },
  'goal-not-sent': {
    what: 'Your reading goal hasn’t reached the server at Sander’s home.',
    safe: 'It’s saved on this device, and your books are safe.',
    fix: 'It will go up by itself next time the server answers. Until then your other devices show the old goal.',
    retry: null,
    sander: false,
  },
  'challenge-not-sent': {
    what: 'Your challenge hasn’t reached the server at Sander’s home.',
    safe: 'It’s saved on this device, and your books are safe.',
    fix: 'It will go up by itself next time the server answers. Until then your other devices don’t show it.',
    retry: null,
    sander: false,
  },
  'books-look-wrong': {
    what: 'Some of your books look wrong or are missing.',
    safe: 'Nothing here will touch them: the server at Sander’s home keeps older copies of your shelf.',
    fix: 'Tell Sander — he can put your shelf back from those copies. Don’t try to fix it by hand first; that makes it harder for him.',
    retry: null,
    sander: true,
  },
}

/** The one honest line for this failure, in her words. */
export function troubleLine(kind: TroubleKind, where: TroubleWhere = {}): TroubleLine {
  const line = LINES[kind]
  if (where.deviceKeeps === false && line.safe.includes('on this device')) {
    return { ...line, safe: NOT_KEPT_HERE }
  }
  return line
}

/** The three parts as one sentence, for a title, an aria-label or a one-line note. */
export function troubleSentence(kind: TroubleKind, where: TroubleWhere = {}): string {
  const { what, safe, fix } = troubleLine(kind, where)
  return [what, safe, fix].join(' ')
}

/**
 * The failure behind a sync state, or null while the shelf is fine. `offline`
 * covers both "the server didn't answer" and "the server refused": the device
 * can't tell them apart, so the line doesn't pretend to either — it says what
 * is certainly true, that the changes haven't arrived.
 */
export function troubleFromSync(sync: SyncStatus): TroubleKind | null {
  if (sync === 'offline') return 'shelf-not-sent'
  if (sync === 'too-big') return 'shelf-too-big'
  return null
}

/**
 * The failure behind an error from a server function. The server's own
 * messages ("The reading-list server can't be reached right now.", "No account
 * server is set up.", a PocketBase message) never reach Hanna: only the kind does.
 */
export function troubleFromError(e: unknown, fallback: TroubleKind = 'shelf-not-sent'): TroubleKind {
  const message = e instanceof Error ? e.message : String(e ?? '')
  if (message === NOT_SIGNED_IN) return 'signed-out'
  return fallback
}

/**
 * The failure behind an error from the Storytel refresh. Storytel's own
 * wording (status codes, "refused the bookshelf request") never reaches her;
 * only "sign in again" or "try later" does.
 */
export function troubleFromStorytelError(e: unknown): TroubleKind {
  const message = e instanceof Error ? e.message : String(e ?? '')
  if (/no longer accepts|No saved Storytel login/i.test(message)) return 'storytel-signed-out'
  return 'storytel-refresh'
}

/** Whether this browser is really keeping a copy, tested by writing one byte and taking it back. */
export function deviceKeepsBooks(storage?: Storage): boolean {
  try {
    const st = storage ?? (typeof localStorage === 'undefined' ? null : localStorage)
    if (!st) return false
    const probe = 'hannas-reading-list:can-store'
    st.setItem(probe, '1')
    st.removeItem(probe)
    return true
  } catch {
    return false
  }
}
