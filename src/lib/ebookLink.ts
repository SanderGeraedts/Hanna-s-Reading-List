/**
 * The link to where Hanna keeps a book's e-book file (#185): Google Drive,
 * her server, anywhere she can paste an address for. The app only stores and
 * opens it; only web links (https:// and http://) are accepted, so a pasted
 * `javascript:` or `data:` address can never end up behind a button.
 */

const WEB = new Set(['https:', 'http:'])

function parse(text: string): URL | undefined {
  try {
    const url = new URL(text)
    return WEB.has(url.protocol) && url.hostname ? url : undefined
  } catch {
    return undefined
  }
}

/** The link as she typed it, trimmed, or undefined when it isn't an https:// or http:// link. */
export function cleanEbookLink(text: string | undefined): string | undefined {
  const trimmed = (text ?? '').trim()
  return trimmed && parse(trimmed) ? trimmed : undefined
}

/**
 * What may go in an `href` for a stored link, checked again on every render
 * so a link from anywhere (another device, an old shelf) is never opened
 * unless it is a web link.
 */
export function ebookHref(link: string | undefined): string | undefined {
  const clean = cleanEbookLink(link)
  return clean ? parse(clean)!.href : undefined
}

/** The host the link goes to, for the button's tooltip, e.g. "drive.google.com". */
export function ebookHost(link: string | undefined): string | undefined {
  const clean = cleanEbookLink(link)
  return clean ? parse(clean)!.hostname : undefined
}
