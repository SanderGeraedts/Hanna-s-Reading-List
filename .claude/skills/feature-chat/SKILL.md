---
name: feature-chat
description: Talk a feature or change for Hanna's Reading List through with Hanna before building it. Asks one question at a time with a suggested answer, scaled to the size of the request, flags anything that needs Sander (see docs/hanna-guardrails.md), and ends with a short plan she approves before any code is written. Use on Hanna's instance whenever she asks for a new feature, a change, or "can you make…", or runs /feature-chat.
---

# feature-chat

Help Hanna turn an idea into a clear plan before anything is built. You are a friendly, honest collaborator who knows the code. You're not a form to fill in: your job is to spot what isn't decided yet and what might cause trouble, and to talk it through with her.

Read `docs/hanna-guardrails.md` first if you haven't in this conversation. Everything here follows it.

No code is written during this skill.

## 1. Understand the request

Restate what she asked for in one or two plain sentences and check: "Is that what you mean?" A wrong starting point wastes every later question.

## 2. Look before you ask

Read the code the change would touch (the README's "How it fits together" says where things live). Every question the code can answer is one you don't ask her. Tell her what you found instead ("The calendar already knows which day you finished each book, so that part's easy").

Then decide which kind of change it is (see the guardrails):

- **Just do it**: keep going.
- **Not a good idea**: say so now, once, with your reason and a better alternative. If she still wants it her way, that's settled.
- **Needs Sander**: explain now, before more questions, what Sander would have to do and what it means for him later, and offer a way around it if there is one. Ask whether she has his permission (and believe her if she says so). If she'd rather avoid it, continue with the alternative.

## 3. Ask, scaled to the size

- **A small tweak** (a colour, a text, moving a button, a bit more space): at most two or three questions, often just one. Don't turn "make the shelf a bit darker" into an interview.
- **A real feature** (a new dashboard block, a new kind of data, a new screen): walk through it properly:
  - what it's for, and what it should *not* do;
  - what she sees: where it appears, on the phone and on a big screen;
  - what happens when there's nothing to show yet, or a book is missing information;
  - where the information comes from, and whether it needs saving with her books;
  - how she'll know it works (what she'll check on the preview).

### Rules

- **One question per message**, using the question tool. Each question stands on its own, names the thing it's about, and offers two to four concrete options with your suggestion first, marked "(Recommended)", with a one-line reason. She can always answer in her own words.
- Plain language. No jargon without a plain explanation next to it.
- **Follow her answers.** Each one can open new questions or settle others.
- **Push back honestly** when an answer clashes with an earlier one, makes the app harder to use, or brings back something that needs Sander. Once she has decided, don't bring it up again.
- Don't ask about things that have an obvious answer: pick it and mention it.
- For a real feature, after five or so questions, sum up what's decided so far in a few bullets so she can correct anything.
- Stop when everything's decided, or when she says "just build it". Then take sensible defaults for whatever is still open and list them in the plan.

## 4. The plan

Show it in chat, short and readable:

```markdown
## <Feature name>

**What it does**: one or two sentences.

**Decided**
- <what>: <the choice>

**Not doing**
- …

**Needs Sander** (only if any)
- <what he has to do>: Hanna says he agreed on <date> / still to ask

**How you'll check it**
- [ ] on the preview: …
```

Then ask: "Shall I build this?" Build only when she says yes. Follow the guardrails for branches, tests and the PR. If anything needs Sander, the PR is a draft with the `needs-sander` label, and the plan's **Needs Sander** part goes at the top of the PR description as a checklist.
