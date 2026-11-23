/** FNV-1a, 32 bits: the same number for the same text on every device (D-0033 §7). */
export function seededHash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * seededHash with a finalizer (murmur3's fmix32), so every bit depends on the
 * whole text: FNV's low bits alone repeat for ids that differ only in a digit,
 * which left some species out of a small tier. Used for what a milestone egg
 * hatches (T-0030); seededHash stays as it is for T-0029's names and shinies.
 */
export function mixedHash(text: string): number {
  let h = seededHash(text)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
