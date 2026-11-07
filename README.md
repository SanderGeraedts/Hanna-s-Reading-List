# Hanna's Reading List

A 3D bookshelf for a personal reading list, built with **React**, **TanStack Start** and **Three.js** (via `@react-three/fiber`).

- Add books by searching [Open Library](https://openlibrary.org), by ISBN, by hand, or by importing your **Storytel** bookshelf.
- Books stand on a wooden bookcase with their spines out. The spine colour comes from the cover, the thickness from the page count, and the width from the cover's shape.
- **Organise:** drag a book along or between shelves to move it, or use **Arrange by** to sort by title, author, series, year, colour, date added or reading status. Sorting by reading status puts a little book nook (a lamplit alley at night, with a sign naming the next group) between the groups. Sorting by series keeps each author's series together and in order. The series is read from the title ("Percy Jackson, Teil 4: …", "Die Kane-Chroniken 2: …", "(Dune, #2)") or from a title opening shared by an author's books ("Harry Potter and the …"). You can type a series and number in the book panel instead.
- **Search:** the magnifier in the top bar (or the `/` key) finds books by title, author, series, genre, language, how you have it, or the friend you lent it to. Pick a result to take the book off the shelf.
- **Details:** in the book panel you can rename a book (✎; titles with edition notes like "(10th Anniversary Recording)" get a one-tap *Shorten*, and the original can be restored), and set how you have it (paperback, e-book, Storytel, library…), its language, its genres, and whether it's lent to a friend (to whom and since when). Renamed titles stay renamed when Storytel refreshes. Genres come from Open Library's subjects when a book is added; books from before get them once in the background, and books Open Library doesn't know take the genres of their series or author. The language is guessed from the title and shown as a small tag at the top of the spine. **Arrange by** can also group the shelf by genre, language or how you have it, with a labelled divider before each group.
- **Inspect:** click a book to pull it off the shelf. Drag to turn it, use **Front / Spine / Back** or the ← → keys to flip it, and press Esc (or click the room) to put it back.
- **Covers:** if a cover is wrong, open the book and choose **Change cover…**. You can pick the cover of another edition from Open Library, or upload your own picture (it's scaled down and saved with your library).
- **On a phone:** held upright, the bookcase fills the width of the screen. Swipe up and down to scroll through the shelves, tap a book to take it out, and press and hold a book to move it.
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
- The password goes to this app's server function (`src/server/storytel.ts`). It's never logged or returned to the browser. To let ↻ refresh later, the login is sealed with AES-GCM under `STORYTEL_COOKIE_SECRET` and kept until *Sign out of Storytel*: with the signed-in account when there is an account server, otherwise in an httpOnly cookie on that device.
- Accounts that sign in with Google, Apple or Facebook have no Storytel password, so they can't use this.
- Covers: the Storytel e-book cover if there is one, otherwise an Open Library match, otherwise the square audiobook cover, centre-cropped. Year, page count, ISBN and blurb come from the best Open Library match. When there's no match, the page count is estimated from the book's length.

## Accounts and syncing

With `POCKETBASE_URL` set, the app asks people to sign in and keeps each person's shelf on a [PocketBase](https://pocketbase.io) server running on the home NAS, reached through Tailscale Funnel. Setup steps, the Docker Compose file and the database schema are in [`deploy/nas/`](deploy/nas/README.md).

- The browser never talks to PocketBase. Sign-in goes through server functions (`src/server/auth.ts`), which keep the PocketBase token in an httpOnly, `SameSite=Lax` cookie (`__Host-session` in production). Tokens last 30 days and are renewed on every visit.
- Each device keeps a copy of the shelf, so it opens at once and works offline. Changes are saved a moment after they're made, and changes from other devices are picked up when the page comes back into view (`useLibrary` in `src/lib/library.ts`).
- The first sign-in on a device moves the shelf that browser had before accounts into the account, with every book and the arrangement, added to whatever another device already saved (no duplicates: same id, Storytel id, ISBN, or title and author). It only counts as done once the server has confirmed the save, so if the server can't be reached it's tried again on the next visit. The old copy (`hannas-reading-list:v1`) is left in the browser as a backup; `hannas-reading-list:v1:migrated` records that it was moved. Tests for this are in `src/lib/library.sync.test.ts` (`npm test`).

Without `POCKETBASE_URL` there's no sign-in, and each browser keeps its own shelf in `localStorage`.

To try it locally, download PocketBase, then run it with the migrations from this repo and create a user in its admin screen:

```bash
pocketbase serve --migrationsDir=deploy/nas/pb_migrations
POCKETBASE_URL=http://127.0.0.1:8090 npm run dev
```

## How it fits together

```
src/
  routes/
    index.tsx                  page: toolbar, 3D scene, book panel, add dialog
    api/cover.$kind.$value.ts  server route that proxies Open Library covers (CORS-safe for WebGL, cached)
  server/openLibrary.ts        TanStack Start server functions: search, work details, ISBN lookup
  server/storytel.ts           Storytel sign-in + bookshelf fetch (server-only)
  server/auth.ts               sign in / out / session, against PocketBase
  server/shelf.ts              load and save the signed-in user's shelf
  server/pocketbase.ts         PocketBase client and the session cookie (server-only)
  lib/storytelImport.ts        merges a Storytel shelf into the library, enriched via Open Library
  routes/api/remote-cover.ts   cover proxy restricted to *.storytel.com
  components/
    BookshelfScene.tsx         Canvas, bookcase, lights, camera fit, drag-to-reorder, inspect controls
    BookMesh.tsx               one book: 6-sided box, cover loading, pull-out/fly/rotate animation
    textures.ts                canvas painters for spine, back, fallback cover, page edges, wood
    AddBookDialog.tsx          search / ISBN / manual tabs
    SignIn.tsx                 sign-in screen
    BookPanel.tsx              details, face buttons, status, rename, format, language, genres, lent, remove
    SearchBox.tsx              search the shelf
  lib/
    library.ts                 Book model, local copy + server sync, sorting
    session.ts                 who is signed in
    shelfLayout.ts             book dimensions and shelf packing
    cover.ts                   cover URLs, dominant-colour + aspect analysis
    search.ts                  matching books for the search box
    genres.ts                  shelf genres from Open Library / Storytel subjects
    languages.ts               language codes, names, and a guess from the title
    titles.ts                  tidying edition notes out of titles
    useBookDetails.ts          fills in genres and language for books added before those existed
deploy/nas/                    account server: Compose file, Tailscale serve config, PocketBase schema, setup guide
```
