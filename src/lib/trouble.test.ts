import { describe, expect, it } from 'vitest'
import {
  deviceKeepsBooks,
  troubleFromError,
  troubleFromStorytelError,
  troubleFromSync,
  troubleLine,
  troubleSentence,
  type TroubleKind,
} from './trouble'
import { NOT_SIGNED_IN } from './signedOut'

const ALL: TroubleKind[] = [
  'shelf-not-sent',
  'shelf-too-big',
  'signed-out',
  'shelf-not-drawn',
  'storytel-refresh',
  'storytel-signed-out',
  'goal-not-sent',
  'challenge-not-sent',
  'books-look-wrong',
]

/** Words the app must never show her: jargon, names of machines, programmer talk. */
const JARGON =
  /pocketbase|localstorage|http|api|fetch|token|json|null|undefined|500|502|stack|exception|error:|nas|webgl|cors|env|sync failed/i

describe('every line', () => {
  it.each(ALL)('%s says what happened, what it means for her books, and a way forward', (kind) => {
    const line = troubleLine(kind)
    for (const part of [line.what, line.safe, line.fix]) {
      expect(part.length).toBeGreaterThan(10)
      expect(part).toMatch(/[.!]$/)
      expect(part).not.toMatch(JARGON)
    }
  })

  it.each(ALL)('%s never offers to repair her books', (kind) => {
    expect(troubleSentence(kind)).not.toMatch(/repair|fix your books|restore|rebuild|reset/i)
  })

  it.each(ALL)('%s says "the server at Sander’s home", never the machine', (kind) => {
    const sentence = troubleSentence(kind)
    if (/server/i.test(sentence)) expect(sentence).toMatch(/server at Sander’s home/)
  })

  it('offers Try again only where trying again can help', () => {
    expect(troubleLine('shelf-not-sent').retry).toBe('Try again')
    expect(troubleLine('shelf-not-drawn').retry).toBe('Try again')
    expect(troubleLine('storytel-refresh').retry).toBe('Try again')
    // signing in again, making the shelf smaller or waiting is the way forward instead
    expect(troubleLine('signed-out').retry).toBeNull()
    expect(troubleLine('shelf-too-big').retry).toBeNull()
    expect(troubleLine('storytel-signed-out').retry).toBeNull()
    expect(troubleLine('goal-not-sent').retry).toBeNull()
    expect(troubleLine('challenge-not-sent').retry).toBeNull()
    expect(troubleLine('books-look-wrong').retry).toBeNull()
  })
})

describe('whether her books are safe', () => {
  it('says they are safe on this device while the server is out of reach', () => {
    expect(troubleLine('shelf-not-sent').safe).toMatch(/safe on this device/)
  })

  it('does not claim this device keeps them when the browser refuses to store', () => {
    const line = troubleLine('shelf-not-sent', { deviceKeeps: false })
    expect(line.safe).not.toMatch(/safe on this device/)
    expect(line.safe).toMatch(/only in this tab/)
  })

  it('leaves a line that never claimed this device alone', () => {
    // the 3D shelf failing has nothing to do with where her books are kept
    expect(troubleLine('shelf-not-drawn', { deviceKeeps: false }).safe).toBe(troubleLine('shelf-not-drawn').safe)
    expect(troubleLine('storytel-refresh', { deviceKeeps: false }).safe).toBe(troubleLine('storytel-refresh').safe)
  })

  it('says nothing on her shelf changed when an outside service failed', () => {
    expect(troubleLine('storytel-refresh').safe).toMatch(/nothing on your shelf was changed/)
    expect(troubleLine('storytel-signed-out').safe).toMatch(/nothing on your shelf was changed/)
  })
})

describe('when it is Sander’s', () => {
  it('sends her to Sander for books that look wrong, and never to a repair', () => {
    const line = troubleLine('books-look-wrong')
    expect(line.sander).toBe(true)
    expect(line.fix).toMatch(/Tell Sander/)
    expect(line.fix).toMatch(/Don’t try to fix it by hand/)
  })

  it('marks Storytel as his, because it is his private connection', () => {
    expect(troubleLine('storytel-refresh').sander).toBe(true)
  })

  it('does not call Sander in for an ordinary unsent change', () => {
    expect(troubleLine('shelf-not-sent').sander).toBe(false)
    // but it does say when it has gone on too long
    expect(troubleLine('shelf-not-sent').fix).toMatch(/tell Sander/)
  })
})

describe('troubleFromSync', () => {
  it('says nothing while the shelf is fine', () => {
    for (const ok of ['local', 'loading', 'saved', 'saving'] as const) expect(troubleFromSync(ok)).toBeNull()
  })

  it('turns the two failing states into their line', () => {
    expect(troubleFromSync('offline')).toBe('shelf-not-sent')
    expect(troubleFromSync('too-big')).toBe('shelf-too-big')
  })

  it('does not guess why the server did not take the changes', () => {
    // the device cannot tell "did not answer" from "refused", so the line claims neither
    const line = troubleLine(troubleFromSync('offline')!)
    expect(line.what).toMatch(/haven’t reached/)
    expect(line.what).not.toMatch(/can’t be reached|refused|broken/)
  })
})

describe('troubleFromError', () => {
  it('knows being signed out', () => {
    expect(troubleFromError(new Error(NOT_SIGNED_IN))).toBe('signed-out')
  })

  it('keeps the server’s own words out of her way', () => {
    expect(troubleFromError(new Error("The reading-list server can't be reached right now."))).toBe('shelf-not-sent')
    expect(troubleFromError(new Error('Request failed (502)'))).toBe('shelf-not-sent')
    expect(troubleFromError(undefined)).toBe('shelf-not-sent')
    expect(troubleFromError(new Error('whatever'), 'goal-not-sent')).toBe('goal-not-sent')
    // signing out still wins over the caller's fallback
    expect(troubleFromError(new Error(NOT_SIGNED_IN), 'goal-not-sent')).toBe('signed-out')
  })
})

describe('troubleFromStorytelError', () => {
  it('tells a dropped login from a bad answer', () => {
    expect(troubleFromStorytelError(new Error('Storytel no longer accepts the saved login. Sign in again under + Add → Storytel.'))).toBe(
      'storytel-signed-out',
    )
    expect(troubleFromStorytelError(new Error('No saved Storytel login on this device. Sign in again under + Add → Storytel.'))).toBe(
      'storytel-signed-out',
    )
    expect(troubleFromStorytelError(new Error('Signed in, but Storytel refused the bookshelf request (403).'))).toBe('storytel-refresh')
    expect(troubleFromStorytelError('something odd')).toBe('storytel-refresh')
  })

  it('never passes a status code through to her', () => {
    expect(troubleSentence(troubleFromStorytelError(new Error('Storytel is unavailable right now (503). Try again later.')))).not.toMatch(
      /503/,
    )
  })
})

describe('deviceKeepsBooks', () => {
  it('is true for a browser that stores', () => {
    const box = new Map<string, string>()
    const storage = {
      getItem: (k: string) => box.get(k) ?? null,
      setItem: (k: string, v: string) => void box.set(k, v),
      removeItem: (k: string) => void box.delete(k),
    } as unknown as Storage
    expect(deviceKeepsBooks(storage)).toBe(true)
    expect(box.size).toBe(0)
  })

  it('is false when the browser refuses (private window, storage full)', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('QuotaExceededError')
      },
      removeItem: () => {},
    } as unknown as Storage
    expect(deviceKeepsBooks(storage)).toBe(false)
  })
})
