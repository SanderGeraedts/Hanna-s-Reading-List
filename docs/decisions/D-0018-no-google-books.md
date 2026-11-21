---
id: D-0018
title: "No Google Books: search, ISBN lookups and imports use Open Library and Storytel only"
description: "Google Books search and the Google Play Books import were built and reverted the same day, because both need a Google Cloud Console setup (an API key and an OAuth client) that isn't going to happen."
status: Accepted
date: 2026-11-07
decided_by: engineer
overrules: []
replaces: []
replaced_by: []
resolves: []
tags: [outside-service, not-planned]
---

# Context

#67 (2026-11-07): Hanna asked to sync and add books from the Google Books app. #72 built Google
Books search with an ISBN fallback and a Google Play Books import. Google refuses keyless requests
(`429, quota limit 0`), so search needs a Books API key on Netlify, and the import needs an OAuth
client and consent screen in the Google Cloud Console.

The Engineer reverted it the same day in #73: "That setup isn't going to happen." The `googleId`
field went with it. The roadmap (#21) lists #67 under *Not planned*.

Global decisions: an outside service with keys and an account is the Engineer's (G-0009); the
guardrails put "APIs or services that need a key, password, token or account" under "Needs Sander".
No overrule.

# Decision

- The app doesn't use Google Books: no search, no ISBN fallback, no Google Play Books import.
- Adding books stays with Open Library (search, ISBN, barcode), Storytel, and typing by hand.

# Rationale

It needs a Google Cloud project, an API key and an OAuth client to set up and keep running, for a
gain Open Library and Storytel mostly cover.

# Consequences

- A request for Google Books again is a question for the Engineer, not a task.

# Guidance for agents

- Don't add Google Books or another keyed book API; raise a question when one is asked for.
