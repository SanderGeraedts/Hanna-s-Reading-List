---
id: D-0084
title: "A bookshop that trades while she is away: her reading stocks the shelves, customers turn stock into coins, and coins buy things she can see"
description: "A cosy idle bookshop, reached from a dashboard block rather than an eighth tab: every minute she reads prints copies, finishing a book puts that title on sale by name, customers buy while she is away with no cap and nothing to collect, and the stock — never a timer — is the limiter. Drawn flat, not in 3D. Coins and stock are worked out from her reading log and the clock like the cookies are; only what she buys is saved, as `s:` keys in the creatures choice log, so nothing waits for Sander."
status: Accepted
date: 2026-11-26
decided_by: requester
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [bookshop, game, dashboard]
---

# Context

Hanna asked for an idle game powered by her reading: something that gets on with it while she
is not looking, and that is about the books she has actually read rather than about numbers
going up. She designed it with Claude in a feature chat on 26 November 2026 and settled every
point below before any code was written.

Three things already in the app shaped it. The **creatures** showed that a whole economy can be
worked out from her reading log and never stored (D-0033 §1). The **garden** showed that a
scene can be drawn flat, with no WebGL, and look at home (D-0051 §2) — and the app is in the
middle of making loading faster, so a third 3D world would undo that work. And the **bingo
swap** showed that a new thing she chooses can ride in the creatures choice log under a key
prefix of its own, with no change on Sander's server (D-0067).

Her tab row already has seven buttons and fills a phone, so an eighth tab was out from the
start.

# Decision

1. **Her reading stocks the shelves.** Every six minutes she reads prints a copy of the book
   she was reading; finishing a book prints twenty more and puts **that title** in the shop
   under its own name. The minutes she read before finishing a book are banked and arrive
   together on the day she finishes it, so a book read over a week lands as a proper pile. A
   re-read prints the whole lot again. Nothing from before the shop opened counts, with one
   exception: **every book she had already read arrives with one copy on opening day**, so the
   door opens on a stocked shop rather than an empty one.
2. **Customers buy while she is away, and the stock is the only limiter.** Each day as many
   customers come in as the shop draws, and each buys one copy and leaves coins. A customer
   who finds the shelves bare **leaves**: nothing is saved up, nothing is owed. A full shop
   therefore trades for days and a bare one trickles, and there is never a timer in the way.
3. **Nothing is ever lost by not opening it.** No offline cap, no "collect your coins" button,
   no daily login reward, no streak, no notifications. Away a week, she comes back to a week of
   trade, as far as the stock lasted. The shop is a **pure function of (books, log, now)**, so
   opening the app twice at the same moment cannot conjure different amounts of trade. A device
   whose clock jumps backwards is held to the furthest day it has already seen, which is a note
   kept in that browser: time going backwards can make the shop stand still, never go back.
4. **Coins buy eight things that earn more and show.** A sign over the door, a proper till, a
   second shelf, a reading chair, a window display, a shop cat, a warm lamp and a tea counter.
   Every one of them changes both the numbers (customers a day, coins a copy) **and** the
   picture: there is nothing to buy that she cannot then see standing in her shop.
5. **Nothing new is saved on the server.** Coins and stock are never stored — they are worked
   out again from her reading log and the clock each time, exactly as the cookies are (D-0033
   §1). What she **buys** rides in the creatures choice log (D-0034) as a `place` event with the
   key `s:up:<thing>`, next to the garden's `g:`, bingo's `b:`, the den's `home:` and the marks
   `f:seen` and `c:earned`. `place` is a setting kind, so only the newest event per key survives
   `mergeLogs` and the log can never grow past one event per thing — eight keys, for ever. The
   price she paid rides along, so changing a price later never changes what the shop cost her.
   The shop deliberately writes **no `buy` events at all**: the creature shop counts every `buy`
   in the log as cookies spent, and **coins and cookies stay separate**. The bookshop does not
   spend, earn or touch cookies, and changes nothing about creatures, the garden, stats,
   challenges or badges. It **reads** her books and never writes to them.
6. **Every number lives in one module** (`src/lib/bookshop/numbers.ts`) with a comment saying
   what it is for, so the balance can be adjusted after she has lived with it without a new
   decision. The rules in §1–§5 are this decision's and do need one.
7. **Drawn flat, not in 3D.** One inline SVG of plain shapes — no WebGL, no images, nothing to
   fetch — in the house style of the flat garden (D-0051 §2). The same drawing is the block and
   the shop, smaller and larger. A third 3D world would undo the loading-speed work going on in
   the same pull request.
8. **A block on the dashboard, not a tab.** The block shows the shop, what sold while she was
   away, the coins and what is in stock, with **"Open ›"** into the whole shop — the pattern the
   Garden and My year blocks already use. The shop opens **over** the dashboard and Escape or ×
   closes it: her tab row is full.

# Rationale

Working the shop out instead of ticking it along is what makes every promise in §3 free. There
is no saved balance to drift, no tick to miss, no reconciliation when two devices disagree, and
no reason to ever ask her to come back and collect something — the trade has already happened
by the time she looks.

Making the **stock** the limiter rather than a timer is what keeps it about reading. A timer
would reward opening the app; shelves reward finishing books, and they empty in a way she can
see and fix in the only way the game accepts: by reading.

Riding in the choice log keeps the whole feature inside this repository. Nothing new runs on
Sander's server, no field is added to `Book`, and nothing waits for him.

# Consequences

- The shop opens on 26 November 2026 with one copy of every book she has ever read and no
  coins; the first thing to buy is a few days of trade away, the last of the eight is months
  away.
- The balance can be re-tuned at any time by editing one module; a purchase already made keeps
  the price it was made at.
- Fixing a past reading day changes what was printed, and therefore the whole shop, the way it
  already changes her cookies.
- Eight keys join the choice log, for ever; nothing else is ever written.
- A browser keeps two small notes of its own — the furthest day it has seen, and the day she
  last looked at the shop. Losing them costs nothing: the shop is unchanged, and the block
  simply says more about what sold, never less.

# Guidance for agents

- **Never store a coin or a copy.** If something about the shop needs saving, it is wrong:
  work it out from (books, log, now) instead, and keep `deriveBookshop` a pure function.
- **Never write a `buy` event from the bookshop.** The creature shop reads every `buy` as
  cookies spent. Use `place` with an `s:` key.
- **Never read another game's keys, and never let another game read `s:`.** The garden's are
  `g:`, bingo's `b:`, the den's `home:`, the marks `f:seen` and `c:earned`.
- **Numbers go in `numbers.ts`,** never inline, and every one of them gets a comment saying
  what it is for.
- **No timers, no caps, no collect button, no streak.** Anything that punishes not opening the
  app contradicts §3 and needs a new decision.
- The shop is drawn flat. A 3D bookshop needs a new decision, and a good reason about loading.
