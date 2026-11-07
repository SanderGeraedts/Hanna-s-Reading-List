import type { Book } from './library'

/**
 * Something from the series in its book nook (#56): a dragon for the
 * Empyrean, a silver stag Patronus for Harry Potter, a trident for Percy
 * Jackson… First by the series' name (in English and German), else by words
 * in its titles and blurbs. Series without a match keep the plain scene.
 */
export type MotifId =
  | 'dragon'
  | 'stag'
  | 'trident'
  | 'pyramid'
  | 'crown'
  | 'rose'
  | 'sword'
  | 'ring'
  | 'wolf'
  | 'crow'
  | 'cat'
  | 'ship'
  | 'quill'
  | 'apple'
  | 'lion'

/** Known series by name, title words or the name of a book in it. */
const SERIES: Array<[MotifId, RegExp]> = [
  ['dragon', /empyrean|fourth wing|flammengekusst|iron flame|onyx storm|eragon|inheritance cycle|eldest|drachenreiter|temeraire|game of thrones|song of ice and fire|lied von eis und feuer|house of the dragon|wings of fire|priory of the orange tree|drachen/],
  ['stag', /harry potter|hogwarts|phantastische tierwesen|fantastic beasts/],
  ['trident', /percy jackson|helden des olymp|heroes of olympus|olympians|trials of apollo|die abenteuer des apollo|camp half-blood/],
  ['pyramid', /kane[- ]chroni|red pyramid|rote pyramide|\bpyramiden?\b|\bpyramids?\b/],
  ['crown', /throne of glass|thron aus glas|red queen|die farben des blutes|cruel prince|elfenkrone|folk of the air|the selection|the crown|queen of nothing|children of blood and bone/],
  ['rose', /court of thorns|reich der sieben hofe|acotar|crescent city|beauty and the beast|serpent (and|&) dove/],
  ['sword', /mortal instruments|chroniken der unterwelt|shadowhunter|infernal devices|chroniken der schattenjager|last hours|witcher|hexer|wheel of time|rad der zeit|mistborn|kingkiller|stormlight/],
  ['ring', /lord of the rings|herr der ringe|hobbit|silmarillion|ringe der macht/],
  ['wolf', /\bwolf|\bwerwolf|\bwerewol|shiver|nach dem sommer|teen wolf/],
  ['crow', /six of crows|krahen|grisha|shadow and bone|legenden der grisha|king of scars|raven cycle|raven boys|wild hunt/],
  ['cat', /warrior cats|\bwarriors\b|woodwalkers|\bkatzen?\b|\bcats?\b/],
  ['ship', /\bpirat|\bpirate|treasure island|schatzinsel|fluch der karibik|caribbean|dark tide|seafarer/],
  ['quill', /tintenwelt|tintenherz|tintenblut|tintentod|inkheart|inkspell|inkdeath|unendliche geschichte|neverending story|bucherstadt|bibliothek|library of|book thief|bucherdiebin/],
  ['apple', /twilight|biss zum|biss zur|schneewittchen|snow white|\bapfel\b|\bapples?\b/],
  ['lion', /narnia|\blowen?\b|\blions?\b/],
]

/** Words in titles and blurbs, for series the table doesn't know. */
const WORDS: Array<[MotifId, RegExp]> = [
  ['dragon', /\b(drache[n]?|dragons?|dragonrider|drachenreiter)\b/],
  ['wolf', /\b(wolf|wolfe|w[oö]lfe|wolves|werwolf|werewolf|werewolves)\b/],
  ['crown', /\b(krone|crown|konigin|queen|konig|king|prinzessin|princess|thron|throne)\b/],
  ['sword', /\b(schwert|sword|klinge|blade|krieger|warrior)\b/],
  ['ship', /\b(schiff|ship|pirat\w*|pirate\w*|meer|sea|ocean|ozean)\b/],
  ['rose', /\b(rose[n]?|dornen|thorns?)\b/],
  ['crow', /\b(krahe[n]?|crows?|raben?|ravens?)\b/],
  ['cat', /\b(katze[n]?|kater|cats?)\b/],
  ['quill', /\b(buch|bucher|book|books|bibliothek|library|tinte|ink)\b/],
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

/** The motif for a series nook, or none. */
export function motifFor(seriesName: string, books: Book[]): MotifId | undefined {
  const names = norm([seriesName, ...books.map((b) => `${b.series ?? ''} ${b.title}`)].join(' | '))
  for (const [motif, re] of SERIES) if (re.test(names)) return motif
  const blurbs = norm(books.map((b) => `${b.title} ${b.description ?? ''}`).join(' '))
  let best: MotifId | undefined
  let most = 0
  for (const [motif, re] of WORDS) {
    const n = blurbs.match(new RegExp(re.source, 'g'))?.length ?? 0
    if (n > most) [best, most] = [motif, n]
  }
  return best
}
