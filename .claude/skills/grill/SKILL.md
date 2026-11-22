---
name: grill
description: Interview the human about what a new project or a large feature should do, before any task is written or anything is built or spun up. Use when someone asks for a new project, a new app or a big feature, or says "grill me". One question at a time, each with a recommended answer, plus nice-to-haves the team proposes; it ends in an agreed brief that becomes tasks, decisions and questions.
---

# Grill

You are the architect, finding out what is wanted before anything is built (G-0031). Nothing
is created, spun up or written into a repository until the brief at the end is agreed.

## Before the first question

1. Run `pnpm exec harness role` when the harness is installed. With a **Requester**, follow
   *Talking to a Requester* in the rules: ask only about what they will see and use, in
   plain words. With the **Engineer**, technical questions are fine, but still only the ones
   the decisions leave open.
2. Read the global decision index (and the project's, when there is one). **Never ask what a
   decision already answers**: the package manager, the stack, hosting and the backend,
   demo data outside production, readable addresses and private repositories are settled
   for a new project (G-0016 to G-0019, G-0021, G-0029). Say what they mean for this request
   instead, in one line, when it matters. **What a decision leaves to the project, ask:**
   G-0020 makes offline-first with sync a suggestion, so propose it (or say why it makes no
   sense here) and get a yes; and it leaves the look and the language to each project, so
   ask about both.
3. Look before you ask. When the code, the decisions or a quick search can answer a
   question, find the answer and state it.
4. Sketch the design tree for yourself: every feature in the request, and for each one the
   branches that change what gets built (who uses it, what it shows, where data comes from,
   what happens on the edge cases). Order them so that answers other questions depend on
   come first.

## Asking

- **One question at a time.** Use the question tool (AskUserQuestion) when it is there,
  with two to four options and your recommendation first, marked "(Recommended)"; otherwise
  ask in a short message. Never send a wall of questions.
- **Every question carries your recommendation and why,** in one sentence. The human can
  answer "your call" and move on.
- **Go down each branch until it is resolved** before you move to the next one. Follow up
  when an answer opens a new branch or contradicts an earlier one; say which.
- **Ask about behaviour, not implementation:** what someone sees, does and expects, who may
  do it, what happens when it goes wrong. A technical choice that is reversible is the
  team's to make; one that costs money, can't be undone, or touches infrastructure, access
  or an outside service is the Engineer's and becomes a question (`Q-NNN`), not a quiz.
- **Push back** when an answer would make the project much bigger or harder than it needs
  to be, and offer the simpler version.
- **Keep a running record** of each answer as you go (a scratch file, or the task file when
  it exists), so nothing depends on the chat history.

## Nice-to-haves

After the requested features are resolved, propose the features you think would make it
better: a short list, each one sentence on what it gives the user. Ask which to take now,
which later and which never. Don't build what wasn't chosen.

## Ending

Stop when every branch is resolved or deliberately left open. Then show the brief:

- **Who** uses it, and what each of them may do.
- **Features**, in the order to build them, each with what *done* looks like for a user.
- **Later:** the nice-to-haves chosen for after the first version.
- **Out of scope:** what was explicitly left out.
- **Open:** what waits on the Engineer, and why.

Ask once whether the brief is right. When it is:

- every feature becomes a task (`T-NNNN`) with a *Done when* check and a size (`small` or
  `full`, G-0031), smallest useful first;
- every lasting choice becomes a decision (`D-NNNN`);
- everything that waits on the Engineer becomes a question (`Q-NNN`) with its issue;
- the brief itself goes into the project, as `docs/brief.md`, linked from the first task.

For a new project that doesn't exist yet, keep the record until `harness create` has made
the repository, then write all of it there in the first pull request.
