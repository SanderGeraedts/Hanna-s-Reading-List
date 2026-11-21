# Lessons

One line each time a task needed rework: the tester sent it back, CI failed twice, or a
human corrected something (G-0014). Newest last. The architect turns a lesson that repeats
into a proposed rule change for the harness.

`- YYYY-MM-DD T-NNNN <role>: what went wrong, and what would have prevented it`
- 2026-11-21 T-0002 architect: two Done-when lines could not pass as written (a log line the plugin always prints; a fake `siteId` that fails with a logged-in Netlify CLI). Run or read the tool once before writing a check about its output.
- 2026-11-21 T-0005 developer: the UX designer sent the search glow back (a dark-spined match was not clearly brighter than dimmed light books at 0.5). Before handing over, check the Design's own "when to adjust" condition against the screenshots, and apply its allowed adjustment when it is met.
- 2026-11-21 T-0009 developer: the favourites save reads the list, changes it and writes the whole list back, so two saves that overlap lose a star. The test called "at the same time" awaited between the two saves, so they never overlapped. A test for simultaneous writes has to start both without awaiting either (`Promise.all`), against the real server.
- 2026-11-21 T-0009 developer: a read-change-write of a whole field over PocketBase's REST API can't be made safe, even with a check after writing. Changes that two writers may make at once need a server-side transaction (a pb_hooks route with `runInTransaction`) or per-item modifiers, and a client queue so one device never overlaps itself.
- 2026-11-21 T-0009 developer: the new hook tests waited a fixed 60 ms for queued server calls, so `npm test` failed in 6 of 7 runs on a busy machine while CI happened to pass. Tests of async queues should wait for a condition (`vi.waitFor`) and drain or unmount each device before the next test, never sleep a fixed time.
- 2026-11-21 T-0009 developer: hook tests that waited a fixed 60 ms against a stand-in server with delays failed on a busy machine. Wait for a condition (the stand-in server quiet, or the expected state), and unmount and drain every device before the next test.
