# Tasks

Generated from the task files by `harness tasks-index`; don't edit by hand (G-0012).
One file per task, from [_template.md](_template.md). Pick from *Open* a task whose
`depends_on` are all Done. One task per session.

## Open

- [T-0001 Adopt the harness at v0.7.0](T-0001-adopt-the-harness.md): D-0001: switch to pnpm, install the harness at v0.7.0 with harness adopt, thin AGENTS.md and CLAUDE.md, CI and auto-merge as callers of the harness's workflows with the backend workflow wired in, and the harness's ruleset on main.
- [T-0003 Show the bookshelf again on a phone](T-0003-show-the-shelf-on-a-phone.md): #181: the shelf isn't shown in the mobile version; find what broke it on narrow screens and fix it, with a test that keeps it fixed.
- [T-0004 Make the text on dark spines white again instead of gold](T-0004-white-spine-text-again.md): #180: since every book became a hardcover, dark spines get gold lettering; put the white lettering back, keeping dark lettering on light spines.
- [T-0006 Add a "Did not finish" reading status, and a dashboard block that brings one back now and then](T-0006-did-not-finish-status.md): #187: books Hanna gave up on can be marked DNF; a dashboard block shows one of them at a time as a reminder to try again.
- [T-0007 Let a book hold a link to its e-book file, shown only when one is added](T-0007-link-to-the-ebook-file.md): #185: an optional link per book to where Hanna keeps the e-book (Google Drive, a server), with an open button in the book panel like "Open in Storytel", shown only when the link is set.
- [T-0008 Bring back a dashboard block with new books she might like that aren't on her shelf](T-0008-dashboard-block-with-new-books-for-her.md): #186: a dashboard block of new releases by her favourite authors and in her favourite genres, from Open Library, leaving out books already on the shelf; built from the Recommended for you block removed in #123.
- [T-0009 Keep the dashboard's favourites with the account, so every device shows the same ones](T-0009-favourites-follow-her-across-devices.md): #182: the starred dashboard blocks are saved per device today; keep them on the account's shelf record on the server, saved on their own like the reading goals.
- [T-0010 Let the task index replace the roadmap issue #21](T-0010-the-task-index-replaces-the-roadmap-issue.md): #21 kept the order of open requests by hand; under the harness the generated task index does that, so #21 points to it and is closed.

## Doing

- [T-0005 Make the books that match a search stand out much more from the rest](T-0005-search-matches-stand-out-more.md): #184: while searching, the matching books light up and the rest dim; make the difference between the two clearly bigger.

## Done

- [T-0002 Stop the local dev server from loading production's environment through the Netlify plugin](T-0002-dev-server-never-loads-netlify-env.md): #156: turn off the Netlify Vite plugin's environment variables in vite.config.ts, so a checkout linked to the Netlify site never reaches the production account server.

## Dropped

None.
