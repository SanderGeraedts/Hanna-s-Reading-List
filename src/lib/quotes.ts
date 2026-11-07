import type { Book } from './library'
import { timesRead } from './library'

/**
 * Quotes for the dashboard (#59), only ever from books Hanna has read, so
 * nothing gives away a book she hasn't. Her own favourite quotes come first;
 * a read book without any can get one from the short list below, which is
 * matched on the title of that very book (in English, German or Dutch), so a
 * quote from book 7 never shows for someone who has only read book 1.
 */

export interface Quote {
  text: string
  /** the book it comes from */
  book: Book
  /** who says it, when known */
  by?: string
}

interface KnownQuote {
  title: RegExp
  text: string
  by?: string
}

const KNOWN: KnownQuote[] = [
  {
    title: /philosopher'?s stone|sorcerer'?s stone|stein der weisen|steen der wijzen/i,
    text: 'It does not do to dwell on dreams and forget to live.',
    by: 'Albus Dumbledore',
  },
  {
    title: /chamber of secrets|kammer des schreckens|geheime kamer/i,
    text: 'It is our choices, Harry, that show what we truly are, far more than our abilities.',
    by: 'Albus Dumbledore',
  },
  {
    title: /prisoner of azkaban|gefangene von askaban|gevangene van azkaban/i,
    text: 'I solemnly swear that I am up to no good.',
  },
  {
    title: /half-blood prince|halbblutprinz|halfbloed prins/i,
    text: 'It is the unknown we fear when we look upon death and darkness, nothing more.',
    by: 'Albus Dumbledore',
  },
  {
    title: /deathly hallows|heiligtümer des todes|relieken van de dood/i,
    text: 'Of course it is happening inside your head, Harry, but why on earth should that mean that it is not real?',
    by: 'Albus Dumbledore',
  },
  {
    title: /\bhobbit\b/i,
    text: 'In a hole in the ground there lived a hobbit.',
  },
  {
    title: /fellowship of the ring|die gefährten|de reisgenoten/i,
    text: 'All we have to decide is what to do with the time that is given us.',
    by: 'Gandalf',
  },
  {
    title: /^(dune|der wüstenplanet)\s*($|[:(])/i,
    text: 'I must not fear. Fear is the mind-killer.',
  },
  {
    title: /kleine prinz|little prince|petit prince|kleine prins/i,
    text: 'Man sieht nur mit dem Herzen gut. Das Wesentliche ist für die Augen unsichtbar.',
    by: 'der Fuchs',
  },
  {
    title: /unendliche geschichte|neverending story|oneindige verhaal/i,
    text: 'Aber das ist eine andere Geschichte und soll ein andermal erzählt werden.',
  },
  {
    title: /^momo\b/i,
    text: 'Denn Zeit ist Leben. Und das Leben wohnt im Herzen.',
  },
  {
    title: /pride and prejudice|stolz und vorurteil/i,
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
  },
  {
    title: /lightning thief|diebe im olymp|bliksemdief/i,
    text: "Look, I didn't want to be a half-blood.",
    by: 'Percy',
  },
  {
    title: /^(the )?hunger games\s*($|[:(])|tödliche spiele/i,
    text: 'May the odds be ever in your favor.',
    by: 'Effie Trinket',
  },
  {
    title: /lion, the witch|könig von narnia/i,
    text: 'Always winter and never Christmas.',
  },
]

/** Every quote that may be shown: from read books only. */
export function quoteChoices(books: Book[]): Quote[] {
  const out: Quote[] = []
  for (const book of books) {
    if (timesRead(book) === 0) continue
    const own = (book.quotes ?? []).map((q) => q.trim()).filter(Boolean)
    if (own.length) {
      for (const text of own) out.push({ text, book })
      continue
    }
    const titles = [book.title, book.originalTitle].filter((t): t is string => !!t)
    for (const k of KNOWN) {
      if (titles.some((t) => k.title.test(t))) out.push({ text: k.text, book, by: k.by })
    }
  }
  return out
}

/** A quote at random, not the one shown last time when there are others. */
export function pickQuote(choices: Quote[], lastText?: string | null, random = Math.random): Quote | undefined {
  const pool = choices.length > 1 ? choices.filter((q) => q.text !== lastText) : choices
  return pool[Math.floor(random() * pool.length)]
}

/** Quotes as typed in one box: separated by an empty line. */
export function parseQuotes(text: string): string[] | undefined {
  const quotes = text
    .split(/\n\s*\n/)
    .map((q) => q.trim())
    .filter(Boolean)
  return quotes.length ? quotes : undefined
}

export const quotesText = (quotes?: string[]) => (quotes ?? []).join('\n\n')
