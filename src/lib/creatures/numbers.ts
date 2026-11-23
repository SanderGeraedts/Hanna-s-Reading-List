import type { SpeciesId } from './species'

/**
 * Every number of the book creatures game in one place (T-0029 Design §1,
 * D-0033 §2 and §6). Tunable here without a new decision; the rules around
 * them (what earns, that nothing is ever lost) are D-0033's.
 */

/**
 * The go-live day of the creatures (D-0033 §1, §3): the day this reaches `main`. Nothing before it
 * earns, so on her first visit the welcome egg comes with no cookies. yyyy-mm-dd, device time.
 *
 * SET THIS TO THE ACTUAL MERGE DAY when rebasing on `main` to open the pull request (and the
 * tester moves it again if the merge slips). 2026-11-24 is the planned day, after T-0027 (#241).
 * Tests work relative to it, so changing it needs no other change.
 */
export const CREATURES_START = '2026-11-24'

// ---- cookies (D-0033 §2) ----------------------------------------------------------------

/** 1 🍪 per this many minutes read or listened, counted on the total. */
export const MINUTES_PER_COOKIE = 5
/** 🍪 for each finished book (a finish day on or after the start). */
export const FINISH_TREAT = 10
/** A sleep read earns this share of what it would otherwise (its minutes and its finish treat). */
export const SLEEP_SHARE = 0.5
/** A page is about this many minutes. */
export const MINUTES_PER_PAGE = 1.5
/** A book with no length at all counts as this many pages (as D-0030). */
export const DEFAULT_PAGES = 280

// ---- feeding and growing (Design §1) ----------------------------------------------------

/** One Feed: this many 🍪, or what's left when fewer. */
export const FEED_SIZE = 5
/** Growth per 🍪 fed. */
export const GROWTH_PER_COOKIE = 1
/** Growth by itself on each reading day from the hatch day on (D-0033 §10). */
export const GROWTH_PER_READING_DAY = 3
/** Taps on Feed within this many ms are one `feed` event with the total, to keep the log small (D-0034). */
export const FEED_COMBINE_MS = 2000

/** Growth needed to go from level n to n + 1: 20 + 5 × (n − 1), at most 80. */
export function levelCost(level: number): number {
  return Math.min(80, 20 + 5 * (level - 1))
}

/** The first level of each stage (D-0033 §11): Baby 1–3, Young 4–9, Grown-up 10 and up. */
export const YOUNG_FROM = 4
export const GROWN_FROM = 10
/** A ⭐ by the name from this level. */
export const STAR_FROM = 11

// ---- moods (Design §7) ------------------------------------------------------------------

/** "Misses you" when the last reading day is this many days before today or more. */
export const MISSING_AFTER_DAYS = 3
/** Sleepy from 22:30 to 06:00 on the device, in minutes after midnight. */
export const SLEEPY_FROM = 22 * 60 + 30
export const SLEEPY_UNTIL = 6 * 60

// ---- hatching (D-0033 §3, §7) ------------------------------------------------------------

/** The welcome egg's id; the first creature's pet id is its egg's id. */
export const WELCOME_EGG = 'welcome'
/** She picks her first creature from these, in species order. */
export const WELCOME_CHOICES: readonly SpeciesId[] = ['cat', 'red-fox', 'capybara', 'red-squirrel', 'adelie-penguin']
/** 1 in this many hatches is shiny (D-0033 §7). */
export const SHINY_ONE_IN = 20

/** A name is 1 to this many characters, trimmed. */
export const NAME_MAX = 20

/** Suggested names per species (Design §9); the first is picked by a seeded hash of the egg id. */
export const SUGGESTED_NAMES: Partial<Record<SpeciesId, readonly string[]>> = {
  cat: ['Biscuit', 'Mochi', 'Pudding', 'Marmalade', 'Tofu', 'Whiskers'],
  'red-fox': ['Maple', 'Ember', 'Clementine', 'Rusty', 'Pumpkin', 'Ginger'],
  capybara: ['Pebble', 'Dumpling', 'Bean', 'Potato', 'Coco', 'Waffle'],
  'red-squirrel': ['Hazel', 'Nutmeg', 'Acorn', 'Conker', 'Cinnamon', 'Pip'],
  'adelie-penguin': ['Waddles', 'Pepper', 'Oreo', 'Puffin', 'Button', 'Domino'],
}

/** "the house cat" in "Hatch the house cat" (Design §3b). */
export const CHOICE_LABEL: Partial<Record<SpeciesId, string>> = {
  cat: 'the house cat',
  'red-fox': 'the red fox',
  capybara: 'the capybara',
  'red-squirrel': 'the red squirrel',
  'adelie-penguin': 'the Adélie penguin',
}

/** "house cat" in "Say hello to your house cat!" and "Your house cat hatched!". */
export const SPECIES_WORD: Partial<Record<SpeciesId, string>> = {
  cat: 'house cat',
  'red-fox': 'red fox',
  capybara: 'capybara',
  'red-squirrel': 'red squirrel',
  'adelie-penguin': 'Adélie penguin',
}
