---
id: T-NNNN
title: "What the task delivers, as an imperative"
description: "One sentence, for the index."
status: Open                # Open | Doing | Done | Dropped
size: full                  # small | full: the architect sizes it (G-0031)
depends_on: []              # tasks that must be Done first
decisions: []               # decisions this task must follow, global (G-) and project (D-)
raised_on: YYYY-MM-DD
done_on: ""
result: []                  # PR URLs
---

# Goal

What this task delivers and why. Enough for a fresh session to start from this file alone.
Written by the architect.

# Done when

The check that proves it: a command and its expected output, a test, or what a named role
(the Engineer or the Requester) confirms.

# Notes

Files, documents, constraints.

# Design

For anything a user sees: what it looks like and how it behaves, written by the UX designer
before it is built, and the designer's review after. "Nothing visible" when that is so.

# Test

Written by the tester: the check as run, its actual output, what was tried to break it, and
the verdict (passed, or sent back with the reason).

# Log

One line each, newest last: `- YYYY-MM-DD <role>: <what happened>`. A last line that starts
its open items with `Remaining:` means a human still has to check something.
