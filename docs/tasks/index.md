# Tasks

Generated from the task files by `harness tasks-index`; don't edit by hand (G-0012).
One file per task, from [_template.md](_template.md). Pick from *Open* a task whose
`depends_on` are all Done. One task per session.

## Open

- [T-0020 Let her drag blocks within Favourites in Arrange, in an order of their own that follows her to every device](T-0020-arrange-favourites.md): In Arrange the ★ Favourites blocks get the same ⠿ handle, drag and arrow keys as the other sections; a move reorders layout.favourites (separate from the block's own section), and the account sync sends it as an unstar and re-star of the shortest tail, worked out against the account's list, so a reorder isn't undone by the next pull and no server change is needed (D-0028).

## Doing

- [T-0001 Adopt the harness at v0.7.0](T-0001-adopt-the-harness.md): D-0001: switch to pnpm, install the harness at v0.7.0 with harness adopt, thin AGENTS.md and CLAUDE.md, CI and auto-merge as callers of the harness's workflows with the backend workflow wired in, and the harness's ruleset on main.
- [T-0003 Show the bookshelf again on a phone](T-0003-show-the-shelf-on-a-phone.md): #181: the shelf isn't shown in the mobile version; find what broke it on narrow screens and fix it, with a test that keeps it fixed.
- [T-0009 Keep the dashboard's favourites with the account, so every device shows the same ones](T-0009-favourites-follow-her-across-devices.md): #182: the starred dashboard blocks are saved per device today; keep them on the account's shelf record on the server, saved on their own like the reading goals.

## Done

- [T-0002 Stop the local dev server from loading production's environment through the Netlify plugin](T-0002-dev-server-never-loads-netlify-env.md): #156: turn off the Netlify Vite plugin's environment variables in vite.config.ts, so a checkout linked to the Netlify site never reaches the production account server.
- [T-0004 Make the text on dark spines white again instead of gold](T-0004-white-spine-text-again.md): #180: since every book became a hardcover, dark spines get gold lettering; put the white lettering back, keeping dark lettering on light spines.
- [T-0005 Make the books that match a search stand out much more from the rest](T-0005-search-matches-stand-out-more.md): #184: while searching, the matching books light up and the rest dim; make the difference between the two clearly bigger.
- [T-0006 Add a "Did not finish" reading status, and a dashboard block that brings one back now and then](T-0006-did-not-finish-status.md): #187: books Hanna gave up on can be marked DNF; a dashboard block shows one of them at a time as a reminder to try again.
- [T-0007 Let a book hold a link to its e-book file, shown only when one is added](T-0007-link-to-the-ebook-file.md): #185: an optional link per book to where Hanna keeps the e-book (Google Drive, a server), with an open button in the book panel like "Open in Storytel", shown only when the link is set.
- [T-0008 Bring back a dashboard block with new books she might like that aren't on her shelf](T-0008-dashboard-block-with-new-books-for-her.md): #186: a dashboard block of new releases by her favourite authors and in her favourite genres, from Open Library, leaving out books already on the shelf; built from the Recommended for you block removed in #123.
- [T-0010 Let the task index replace the roadmap issue #21](T-0010-the-task-index-replaces-the-roadmap-issue.md): #21 kept the order of open requests by hand; under the harness the generated task index does that, so #21 points to it and is closed.
- [T-0011 Add a quick update button to move a book on or finish it without the full book panel](T-0011-quick-update-for-reading.md): A round 📖 button in the corner of every page opens the books Hanna is reading as big covers; tapping one opens a small card with big − / + buttons, typing the page, Finished! and More.
- [T-0012 Make the book nooks little 3D worlds: all ten scenes](T-0012-3d-book-nooks.md): Hanna wants the nooks to look like real book nooks: tiny 3D houses, towers and lanterns with warm light, merged so each nook is cheap to draw; the alley and the castle first, the other eight scenes in later steps.
- [T-0013 Let Make a wish take wishes and grant three books, picked smartly, with series strictly in order](T-0013-make-a-wish-v2.md): Step 1: optional wishes for length, genre and language. Step 2: three books from her pile, favouring those that waited longest, authors she loves and series she enjoys; a book only shows if every earlier book of its series is read.
- [T-0014 Motivate reading from the pile: in vs. out, two coin jars, dust off the oldest and a pile challenge button](T-0014-motivation-for-the-pile.md): The want-to-read block shows this month's books in vs. out with a 6-month line and two coin jars (buying and Storytel), Waiting for you offers the longest-waiting book once a week, and Challenges gets a Pile challenge button.
- [T-0015 Let Hanna set where a book is set, and count the imaginary lands on the map](T-0015-places-on-the-map.md): The book panel gets a Set in field (places as chips with ×, add map countries from a list or type a made-up place), her places replace Open Library's and are never looked up again, and the world map shows imaginary lands with counts, most first.
- [T-0016 Make the buying jar spend what a book cost: ask the price of bought books, show the coin count, allow below zero](T-0016-buying-jar-with-prices.md): The add dialog asks the price of a bought paperback, hardcover or e-book (and the file link for a free e-book), the book panel shows and edits it, and the 📚 buying jar spends €5 per coin exactly, shows just its count and may go below zero.
- [T-0017 Suggest a book for an empty bingo square, keep A–Z tips to the series order and never recommend sleep reads](T-0017-bingo-suggestions.md): Tapping an empty square on the bingo card being played shows one fitting book from her pile (cover, title, Open, Another one), A–Z tips only offer want-to-read books she can start next, and readNextChoices leaves out sleep reads everywhere.
- [T-0018 Fill the countries on the world map with her covers, show imaginary lands as rows of covers, and drop every number from the block](T-0018-covers-on-the-world-map.md): Each lit country on Where your books are set becomes a patchwork of the covers of all finished books set there (spine colour for a book without a cover), imaginary lands get one row per land with tiny covers, and the block shows no counts anywhere: list, hover text, lands, screen-reader label and waiting line.
- [T-0019 Let her pick a book's spine colour from swatches taken from its cover, with Back to automatic](T-0019-spine-colour-picker.md): The book panel gets a Spine colour row with 5–6 swatches from the book's cover (the dominant one first, marked ★ Dominant, the current one ✓); a tap sets book.color and the spine and back repaint at once; Back to automatic gives the cover's colour again, or colorFromString(title) for a book without a cover.

## Dropped

None.
