# Lessons

One line each time a task needed rework: the tester sent it back, CI failed twice, or a
human corrected something (G-0014). Newest last. The architect turns a lesson that repeats
into a proposed rule change for the harness.

`- YYYY-MM-DD T-NNNN <role>: what went wrong, and what would have prevented it`
- 2026-11-21 T-0002 architect: two Done-when lines could not pass as written (a log line the plugin always prints; a fake `siteId` that fails with a logged-in Netlify CLI). Run or read the tool once before writing a check about its output.
- 2026-11-21 T-0005 developer: the UX designer sent the search glow back (a dark-spined match was not clearly brighter than dimmed light books at 0.5). Before handing over, check the Design's own "when to adjust" condition against the screenshots, and apply its allowed adjustment when it is met.
- 2026-11-21 T-0003 developer: three fixes in a row (#206, #207, phone-smooth-shelf) were guesses at why the shelf failed on Hanna's phone; the real cause (Chrome had blocked WebGL after earlier crashes) only showed once the error note printed its reason. When a failure only happens on a user's device, make the app show the reason first, then fix.
