# Hanna's Reading List

A 3D bookshelf for a personal reading list, built with **React**, **TanStack Start** and **Three.js** (via `@react-three/fiber`).

- Add books by searching [Open Library](https://openlibrary.org), by ISBN, or by hand.
- Books stand on a wooden bookcase with their spines out. The spine colour comes from the cover, the thickness from the page count, and the width from the cover's shape.
- **Organise:** drag a book along or between shelves to move it, or use **Arrange by** to sort by title, author, year, colour, date added or reading status.
- **Inspect:** click a book to pull it off the shelf. Drag to turn it, use **Front / Spine / Back** or the ← → keys to flip it, and press Esc (or click the room) to put it back.
- Mark a book as *Want to read*, *Reading* or *Read*.

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

## How it fits together

```
src/
  routes/
    index.tsx                  page: toolbar, 3D scene, book panel, add dialog
    api/cover.$kind.$value.ts  server route that proxies Open Library covers (CORS-safe for WebGL, cached)
  server/openLibrary.ts        TanStack Start server functions: search, work details, ISBN lookup
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
