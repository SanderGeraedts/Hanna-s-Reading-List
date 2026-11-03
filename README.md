# Hanna's Reading List

A 3D bookshelf for a personal reading list, built with **React**, **TanStack Start** and **Three.js** (via `@react-three/fiber`).

- Add books by searching [Open Library](https://openlibrary.org), by ISBN, by hand, or by importing your **Storytel** bookshelf.
- Books stand on a wooden bookcase with their spines out. The spine colour comes from the cover, the thickness from the page count, and the width from the cover's shape.
- **Organise:** drag a book along or between shelves to move it, or use **Arrange by** to sort by title, author, series, year, colour, date added or reading status. Sorting by reading status puts a little book nook (a lamplit alley at night, with a sign naming the next group) between the groups. Sorting by series keeps each author's series together and in order. The series is read from the title ("Percy Jackson, Teil 4: …", "Die Kane-Chroniken 2: …", "(Dune, #2)") or from a title opening shared by an author's books ("Harry Potter and the …"). You can type a series and number in the book panel instead.
- **Inspect:** click a book to pull it off the shelf. Drag to turn it, use **Front / Spine / Back** or the ← → keys to flip it, and press Esc (or click the room) to put it back.
- Mark a book as *Want to read*, *Reading* or *Read*. A book you're reading gets a large paperclip bookmark, each in its own rainbow colour, clipped onto your current page (set with the slider in the book panel, or imported from Storytel); it pokes up above the pages, so you can see on the shelf how far along you are. Finished books get a medal on a striped ribbon at the bottom of the spine, showing how many times you've read the book (set with *Times read* in the book panel): bronze for once, silver for twice, gold for three times or more.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build -> dist/
```

## Where the book images come from

| Side       | Source                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| Front      | Open Library Covers API (`covers.openlibrary.org`)                        |
| Spine      | Generated on a canvas: title, author, and a colour sampled from the cover |
| Back       | Generated: the Open Library description, page count and ISBN barcode      |
| Page edges | Generated paper texture                                                   |

No public API provides spine or back-cover images. Open Library, Google Books and ISBNdb only serve front covers, so the other sides are generated. Books without a cover on Open Library get a generated front cover too.

## Storytel import

The **Storytel** tab in *Add book* signs in with your Storytel email and password and imports your bookshelf. Storytel statuses map to reading statuses: want to read, reading, and finished (shown as *Read*). Running it again adds new books and updates statuses. It never creates duplicates.

- Storytel has **no public API**. The import uses the same private endpoints as the Storytel apps (`www.storytel.com/api/login.action` and `api.storytel.net/libraries/bookshelf`). The approach follows the open-source [storytel-player](https://github.com/debba/storytel-player). Storytel can change these endpoints at any time, and automated access may go against its terms of service.
- The password is sent to this app's server function (`src/server/storytel.ts`), used for a single sign-in, and then discarded. Nothing is stored, logged, or returned to the browser.
- Accounts that sign in with Google, Apple or Facebook have no Storytel password, so they can't use this.
- Covers: the Storytel e-book cover if there is one, otherwise an Open Library match, otherwise the square audiobook cover, centre-cropped. Year, page count, ISBN and blurb come from the best Open Library match. When there's no match, the page count is estimated from the book's length.

## How it fits together

```
src/
  routes/
    index.tsx                  page: toolbar, 3D scene, book panel, add dialog
    api/cover.$kind.$value.ts  server route that proxies Open Library covers (CORS-safe for WebGL, cached)
  server/openLibrary.ts        TanStack Start server functions: search, work details, ISBN lookup
  server/storytel.ts           Storytel sign-in + bookshelf fetch (server-only)
  lib/storytelImport.ts        merges a Storytel shelf into the library, enriched via Open Library
  routes/api/remote-cover.ts   cover proxy restricted to *.storytel.com
  components/
    BookshelfScene.tsx         Canvas, bookcase, lights, camera fit, drag-to-reorder, inspect controls
    BookMesh.tsx               one book: 6-sided box, cover loading, pull-out/fly/rotate animation
    textures.ts                canvas painters for spine, back, fallback cover, page edges, wood
    AddBookDialog.tsx          search / ISBN / manual tabs
    BookPanel.tsx              details, face buttons, status, remove
  lib/
    library.ts                 Book model, localStorage persistence, sorting
    shelfLayout.ts             book dimensions and shelf packing
    cover.ts                   cover URLs, dominant-colour + aspect analysis
```

The library is stored in the browser's `localStorage` (key `hannas-reading-list:v1`), so each browser has its own shelf. To sync a shelf across devices, replace `useLibrary` with server functions backed by a database.
