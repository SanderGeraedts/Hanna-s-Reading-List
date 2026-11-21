---
id: Q-002
title: "May AI come back for completing series, page edges, quotes and back texts, with a paid API key on Netlify?"
description: "Hanna asked (#183) for completing series, book edges, quotes and back texts made with the help of AI; AI was removed on 12 November (#117) together with ANTHROPIC_API_KEY, and bringing it back costs money per request and needs a key."
status: Open
raised_on: 2026-11-21
raised_by: architect
issue: "https://github.com/SanderGeraedts/Hanna-s-Reading-List/issues/189"
blocks: []
resolved_by: []
tags: [outside-service, money]
---

# Question

Hanna asked in #183: "Make these things with the help of AI: completing series, book edges,
quotes, back texts of books."

The app had AI for some of these until 12 November, when it was all removed (#117, "No AI
anywhere"): the Anthropic SDK, the AI helper and three AI server functions went, and
`ANTHROPIC_API_KEY` was no longer needed. What exists now without AI:

- **Page edges:** *From the cover*, 12 patterns and colour pickers (the *Describe it* box went
  with #117).
- **Back texts:** the Open Library description, *Find back text* and back-text search (#114).
- **Quotes:** typed by Hanna (loved quotes on the dashboard).
- **Completing series:** the *Complete your series* block used Open Library after #117, and was
  removed on 13 November at Hanna's request (#123).

Bringing AI back needs an API key for a paid AI service as a secret on Netlify, and every use
costs money, billed to the Engineer. It is an outside service and a recurring cost, so it is
the Engineer's (G-0009), and it reverses #117.

# Options

1. **Keep the app free of AI** (as #117 decided). The team can offer the non-AI versions
   instead, as separate tasks if Hanna wants them: bring back *Complete your series* from Open
   Library, improve *Find back text*. No cost, no key.
2. **Bring AI back with a spending cap.** One provider and model chosen by the Engineer, the
   key on Netlify's production context only, a monthly limit set at the provider, and every AI
   feature quietly falling back to today's behaviour when the key is missing or the limit is
   reached. Previews and local development never get the key (G-0019).
3. **Bring AI back for some of the four only**, e.g. back texts and series, where Open Library
   is weakest, with the same cap as option 2.

**Recommendation: option 1 for now**, because #117 removed AI on purpose and there is no new
reason in #183 beyond wanting it; option 3 if the Engineer is happy with a small monthly cost,
since back texts and series are where AI helped most. Nothing is built for #183 until this is
answered.

# Answer

Open.
