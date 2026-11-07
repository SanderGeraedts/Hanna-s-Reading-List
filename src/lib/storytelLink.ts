import type { Book } from './library'

/**
 * A link to a book on Storytel (#65). Storytel's book pages look like
 * storytel.com/nl/books/<title>-<id>, where the id is the one its bookshelf
 * gives us. Without the country Storytel sends the visitor to their own, and
 * a wrong title part is corrected, so only the id has to be right. On a phone
 * with the Storytel app the link opens the app.
 */
export function storytelLink(book: Pick<Book, 'title' | 'storytelId'>): string | undefined {
  const id = book.storytelId?.trim()
  if (!id || !/^[\w-]+$/.test(id)) return undefined
  const slug = book.title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return `https://www.storytel.com/books/${slug ? `${slug}-` : ''}${encodeURIComponent(id)}`
}
