# Lessons

One line each time a task needed rework: the tester sent it back, CI failed twice, or a
human corrected something (G-0014). Newest last. The architect turns a lesson that repeats
into a proposed rule change for the harness.

`- YYYY-MM-DD T-NNNN <role>: what went wrong, and what would have prevented it`
- 2026-11-21 T-0002 architect: two Done-when lines could not pass as written (a log line the plugin always prints; a fake `siteId` that fails with a logged-in Netlify CLI). Run or read the tool once before writing a check about its output.
- 2026-11-21 T-0009 developer: the favourites save reads the list, changes it and writes the whole list back, so two saves that overlap lose a star. The test called "at the same time" awaited between the two saves, so they never overlapped. A test for simultaneous writes has to start both without awaiting either (`Promise.all`), against the real server.
