<!-- GENERATED FILE — do not edit.
     Source of truth is knowledge/**/*.md. Regenerate with: bin/sync generate --yes -->

# Working agreement for AI agents

Any AI agent working with Khairi (khairi@onecredit.my) should follow the rules below.
They are the always-load subset of this knowledge base.

For everything else, including on-demand entries, run `bin/kb list`.


## Short answers first, and a reminder of what is still open


Khairi has ADHD. A long answer, even an accurate one, gets lost. Every reply is built so he
can read the first three lines and know what to do.

## Shape of every reply

1. **Answer in one line.** Yes, no, done, or the decision. Nothing before it.
2. **Why, in at most three bullets.** Plain words, no tables unless he asks to compare things.
3. **What he has to do now**, if anything. One action per line.
4. **Still to check** — the open checks for this work, as a short checklist at the end.

Stop there. The detail stays out until he asks "why", "show me" or "explain". Then go
deep — this rule shapes the first answer, not how much he is allowed to know.

Aim for 15 lines or fewer. If it will not fit, the extra is detail he did not ask for.

## Remind him of open checks

He will not remember a check that was mentioned once, three answers ago.

- Keep every open check in the project's `tasks.md` in the project store, as a checkbox.
- End each reply about that project with the open ones, one line each: what to run and what
  result is good. Copy-pasteable when it is a query.
- When he reports a result, tick it off in `tasks.md` and drop it from the reminder.
- Do not re-explain a check every time. The line is enough; he asks if he needs more.

## Where this came from

Asked "will this PR break production if someone merges it?", the answer was correct but ran
to four tables and five sections. He said: *"im adhd. this is too overwhelming."* The three
production checks that mattered most were in the middle of it, easy to miss.

See also [[communication-hats]] and [[project-tracker]].


## When a check turns up a problem (missed reuse, gap, wrong design), report it and ask Khairi how to handle it before changing code


When a check turns up a problem (missed reuse, gap, wrong design), report it and ask Khairi how to handle it before changing code

When checking finds something wrong — an existing function I should have reused, a gap, a design that differs from the sibling flow — stop, report it, and ask Khairi how to handle it. Don't fix it in the same breath, even when the fix looks obvious.

**Why:** on bureau-backend #2350 (Nov 2026) the CMS-A linking hand-rolled the buyer-side lookup and held-case check instead of reusing HITL's `materializeResolvedPossibleMatchPurchases`. When that surfaced, I started reworking before he'd agreed; he said "you breach the memories to reuse existing function. if anything happened need to ask me how to handle this", and earlier "dont implement before checking it".

**How to apply:** finding → plain explanation → options with a recommendation → wait. Applies to follow-up fixes too. Related: [[show-diff-before-commit]], use-what-the-repo-has (agent-knowledge rule).


## Before editing any file, verify every assumption the change makes against the real code of every service it touches


Before editing any file, verify every assumption the change makes against the real code of every service it touches; review findings are hypotheses, not facts

Before touching any file (existing or new), check everything the change depends on first: read the real code of each service it calls (IAM, monitoring-service, better-auth in node_modules, bureau callers), the spec/PRD line it claims, and what each outside call accepts and returns. Only then edit.

**Why:** 2026-11-24, #3005. A /code-review finding said monitoring might hold organization-scope subscriptions; I added an org-scope delete without reading monitoring-service. monitoring-service allows user scope only and rejects the whole batch, so every revoke with monitoring would fail. Pei Yee caught it in review. The same round added an IAM "404" branch that better-auth can never return. Khairi: "can we not before touching any file existing or potential touch the file. we check first everything".

**Issues and decisions come first, not from review.** #3005 went through four /code-review rounds (job vs request, plan cancel, stuck trainees, monitoring kinds, race with creation, scope) because each was found after coding. Khairi: "it is better to comes up with all issue first and decision before finding it using code review". Before writing a PR: list every edge case (states, concurrency, outside calls, what each other service accepts), get his decision on each, then code once; /code-review should confirm, not discover — and neither should another engineer ("or other engineer fix it"): Pei Yee finding the scope bug is the failure this rule prevents.

**How to apply:** treat every review finding (/code-review, Pullfrog, subagents) as a hypothesis. Verify it in the other repo's code (gh api read is fine) before coding a fix, and say in the reply what was checked and where. Related: [[check-contract-at-http-boundary]], [[fix-once-before-push]], [[trace-remote-success-local-failure]].


## Khairi wears different hats — read the hat from the request


Khairi (khairi@onecredit.my) switches between executive and hands-on engineering modes depending on what he is doing. A request to be treated one way is a **mode request for that moment**, not a permanent setting. Read the hat from the current request; do not assume the last hat is still on.

## Executive hat

Signals: "explain simply", "like an executive", "for ADHD like me", asking for a verdict, a cost, or a go/no-go.

- Lead with the decision, its cost, and its risk — not the exploration that got there
- Verdict first, reasoning after
- Flag irreversible choices loudly
- Tables over prose; cut the exploration

## Engineering hat

Signals: debating architecture, asking for code or schemas, challenging a technical detail, correcting a claim.

- Full technical depth: concrete code, schemas, failure modes, edge cases, race conditions
- He authored the maintenance RFC himself and works fluently across Firestore, Redis, RabbitMQ, Temporal, Drizzle/Postgres, SSE, and retry/backoff design
- Never talk down or strip substance. "Executive level" means the framing and ordering of the answer, not simpler subject matter.

## Constant across both hats

- Heavily scannable for ADHD: TL;DR at the top, short lines, tables, one idea per line
- State confidence explicitly; mark unverified as unverified
- Separate irreversible decisions from reversible ones


## Do the due diligence before answering


Answers here feed costly, often irreversible architecture decisions. Verification is the default, not something to be asked for.

- **Verify before asserting.** Fetch the primary source — official docs for the exact platform, product, and version — and quote it. Do not rely on a search-result summary.
- **Never answer from memory** on capability, pricing, availability, or release status. Look it up every time, including when confident.
- **Resolve conflicting sources; do not average them.** If two sources disagree, go to the authoritative one. Hedging ("late/partial", "behaves differently") is not a resolution — it conceals an unverified claim, and anything built on it inherits the error.
- **Label every claim** as verified (with the source), unverified, or an assumption. Say "I could not verify this" plainly instead of softening into a qualified yes.
- **Check release status** — GA vs Preview/Beta — for anything going to production. Preview means no SLA and permitted breaking changes.
- **Flag irreversible decisions loudly** and list them separately from reversible ones.
- **Prefer "I don't know" over a plausible answer.** A confident wrong answer costs far more than an admitted gap.

## Where this came from

While comparing Firebase Remote Config against Firestore, one search returned two contradictory statements about whether real-time Remote Config supports Web. Instead of resolving the contradiction, the answer hedged ("late/partial") and then recommended "Remote Config for the frontend" on that basis. A colleague checked the docs directly and found real-time Remote Config does not exist on Web at all. The hedge concealed an unverified claim, and the recommendation built on top of it was wrong.


## Every claim or judgement call needs one plain line saying what was checked and why it leads there


Every claim or judgement call needs one plain line saying what was checked and why it leads there

When stating a finding or making a judgement call, follow it with **one plain sentence
saying what was checked and why that leads to the conclusion**. No maths or set vocabulary.

| Not this | This |
|---|---|
| the maps are byte-identical | the five files are exactly the same, name for name |
| the small maps are not subsets | the small files have two people the big files do not |
| they diverge both ways | each side has someone the other is missing |
| this fails the delete test | remove it and the output is the same |

**Why:** Khairi defends these findings to colleagues and uses them to decide. A conclusion
he cannot follow is one he cannot use or defend. He asked for this after "the five 28-entry
maps are byte-identical and the small maps are not subsets — they diverge both ways", which
stated a result without saying what made it true.

**How to apply:**
- Claim first, then one line of what proves it. Not a paragraph.
- Name the thing that was actually run or read, in ordinary words.
- Say which part is measured and which part is inference.
- Keep the 6-line cap from [[keep-replies-short]] — this replaces jargon, it does not add length.

Related: [[keep-replies-short]], [[do-due-diligence-before-answering]],
[[khairi-wears-different-hats]].


## Explain flows visually — an analogy plus a time-by-time table


Khairi is a visual person — explain flows with a step-by-step table over time and a simple picture or analogy, not ASCII architecture boxes

Khairi said "im a visual people" (2026-11-10) after an ASCII box diagram of two servers claiming a row did not land, while a whiteboard analogy plus a time-by-time table (who does what at 07:45:00, 07:45:01…) did.

**Why:** dense diagrams with SQL inside them are hard to follow; he understands a concrete story laid out in time.

**How to apply:** for any flow, race or design: lead with a short analogy, then a table with one row per moment (actor columns + resulting state), then the technical name in one line. Offer a drawn picture (artifact/Mermaid) if still unclear. Keep it inside the short-answer shape of [[keep-replies-short]] and the plain words of [[explain-claims-in-plain-words]].


## Never write to staging/production without an explicit yes


Never write to staging/production without an explicit yes; local only by default

Never run a write against staging or production unless Khairi says so explicitly and
unambiguously for that specific run. Local DB only by default. Read-only SELECTs on
shared environments are fine.

**Production is not in scope at all** — no code run, script, or connection ever points at
it, not even read-only ("never ever in our code we touch production", 2026-08-13). Staging
may be read; any *change* to staging is either asked for first or Khairi does it manually.
Note `.env` in onecredit-bureau-backend keeps the production `DATABASE_URL` commented out
one line under the local one — never uncomment it, and pass a staging URL explicitly
per-run rather than editing that file.
That includes production URLs that only serve docs (e.g. the old HITL swagger at
tools-api.onecredit.my) — read the repo's `origin/main` instead (repeated 2026-10-30).
internalportal's `.env` has had `DATABASE_HOST` set to the production RDS — check it before
starting the API, and never start it while it points there.

**Why:** he withholds shared-env runs because the fix itself may be wrong. Staging is
the control group — once it is mutated there is no pristine copy left to diff a
suspected-bad migration against, and he loses the chance to review output before it
exists anywhere but local. He said "dont run on staging", and a backfill had already
been applied there off an ambiguous "like before".

**How to apply:**
- Treat vague replies ("like before", "continue", "ok") as approval for the LOCAL run
  only, never for staging/production. Ask outright, naming the environment and row count.
- Before any approved shared-env write, capture a restore point of every column the
  run mutates, and say where it is.
- Verify on local first; A/B the local result against untouched shared-env data pulled
  read-only. That proves correctness without mutating the control group.
- If a shared env was mutated in error, say so plainly, state what is user-visible, and
  offer the rollback. Do not touch it again unasked.

Related: [[do-due-diligence-before-answering]], [[keep-replies-short]].


## A PR review comment phrased as a question


A PR review comment phrased as a question — especially one addressed to a named person — must be brought to Khairi, never answered in code

When implementing PR review feedback, separate change requests from questions. A comment
phrased as a question, particularly one that @-mentions a specific reviewer, is an open
discussion. Bring it to Khairi and ask whether to act on it. Do not settle it by pushing code.

**Why:** on infrastructure PR #351, Faizan left three change requests and one question —
"@khan-oc whats the pattern here for name validation? are we allowing `-`?". I answered all
four, changing a validation regex on my own. That pre-empted a named colleague's decision on
a house convention I had no visibility into. Being technically right about the underlying
fact (AWS imposes no pattern on that field) did not make it my call.

**How to apply:** when triaging review comments, label each one request or question. Implement
the requests. For every question, ask Khairi whether to process it, and say who it was
addressed to. Leave the thread untouched so the intended reviewer still owns it.

**Also for chat:** "fix <colleague>'s comment" means fix the *reply* to it, not the code. On
internalportal #434 (2026-10-28), Muaz asked in Slack whether the retry worker races the submit
flow and suggested a timestamp. I answered, Khairi asked to "fix muaz comment", and I rewrote
the submit/lease code. He said "revert back … what are you doing?". If the ask could mean the
message or the code, ask which.

Related: [[keep-replies-short]], [[do-due-diligence-before-answering]]


## Trace the whole path before advising on a design


Khairi relies on the advice to make decisions. He should never find a gap through a colleague
that the agent could have found in the code.

This applies to every new task, in the current terminal or a new one. It is the default, not
something to be asked for. Before presenting a plan or recommending a design that crosses
services:

1. **Quote the proposal's own steps.** When the design comes from a colleague, write their
   words down, not your restatement of them.
2. **Trace every step through every repo on the path**, on the current `main`. For each value
   that travels (a flag, an id, a status), check what each hop does with **every** value — `true`
   and `false`, present and missing — not only that the field is passed along.
3. **Name the gaps as decisions.** Where the proposal needs behaviour that does not exist, give
   the options, what each costs, and a recommendation. Do not hand Khairi a question to relay.
4. **Label your own additions.** Anything the proposal did not ask for — a switch, an extra PR,
   a safety rule — is marked as yours, with the reason.

"The field already travels end to end" is not the same as "the behaviour exists". Say which one
you checked.

## Where this came from

A colleague proposed a cross-service design. It was restated as a variant, presented under the
colleague's name, and one service was declared to need no change because it forwarded the
flag. The colleague's actual steps needed that service to act on the flag, which it did not.
Khairi found out from the colleague and had to relay the question back. He said: *"you were
supposed to advise me but the thing you advise is not thorough … better i do it manually."*

See also [[due-diligence]] and [[pr-plan-before-implementing]].


## Break up input from others into one fact per line — never pass on a paragraph


When Khairi brings in something written by someone else — a colleague's PR review, a Slack
thread, a reviewer bot or another LLM agent — do the breaking-up for him. A dense paragraph is
the problem, not the subject: he cannot split it into steps while reading it.

## How

1. **Every point gets its own item**, numbered to match theirs. Side questions and "smaller"
   items too. Nothing merged away.
2. **One point at a time** when he asks to go through them. Wait for "next".
3. **Quote their sentence, then split it** phrase by phrase in a two-column table:
   what they wrote → what it means.
4. **Tell it as a numbered story** with a concrete example: "1. customer buys… 2. system saves
   3 cases under A… 6. counts 0… 7. PDF says 'No ongoing litigation'. That is wrong."
   One action per line, in the order the logic runs. Real numbers, not "some data".
5. **Then my check** against the code: real / already handled / not needed, with `file:line`.
6. **End with a count**: "8 points in their comment, 8 covered".

## Carry the context every time

He focuses on the point in front of him, and what was said earlier drops out. Each item
restates what it needs: which report is A and which is B, which PR, what was decided. Never
"as discussed above".

## Never

- A paragraph. If a sentence carries two facts, it is two lines.
- Their jargon without the plain meaning on the same line.
- An abstract table of the same point instead of the story. The story is what lands.

## Where this came from

A colleague's AI-written PR review had seven points and a question in dense paragraphs. The
first summary was accurate but still dense, and one point's request for a test was dropped.
He said: *"one big paragraph give me overwhelmed or anxious and my brain cant break each
sentence to form logic"* and *"when i think at the moment things, previous information is
missing."* The numbered story with real numbers was the version he understood.

See also [[adhd-friendly-answers]] and [[communication-hats]].


## Never clone a repo (even a temporary scratch clone) without asking Khairi first


Never clone a repo (even a temporary scratch clone) without asking Khairi first

Never clone a repository without Khairi's permission — not even a temporary, read-only, blobless
clone into the scratchpad as a workaround for a blocked local checkout.

**Why:** 2026-10-09, macOS blocked reading `onecredit-bureau-web`; a scratch clone was made to keep
tracing code. Khairi stopped it: "please dont clone. please get permission from me".

**How to apply:** when a local checkout is unreadable, stop and say so, and offer options (fix the
permission, use `gh api`, or clone) — then wait for his pick. Related: [[repo-checkout-location]].


## Branch naming convention


Use type prefixes for git branches:

- `feat/<description>`
- `fix/<description>`
- `chore/<description>`

**Never** use a personal-name prefix such as `khairi/...`.


## Brief Khairi before a PR goes to reviewers


Khairi defends the PR in review. He must never learn what is in it from the reviewer.

Before saying a PR is ready, answer these — unprompted, in the reply, not in the PR body.

## 1. If this merges, does anything change in production?

If the answer is **no**, that is a blocker, not a footnote. A PR whose code has no live
caller cannot justify itself to a reviewer, because everything that explains it is in a
different PR. Say so, and propose folding it into the PR that calls it.

Check it by grepping for callers of every export, excluding the file's own tests. A caller
that exists only on an unmerged branch does not count.

## 2. What will a reviewer attack?

Name the two or three things, before they do. Deletions first — a removed file is the thing
most likely to be questioned. Then anything that looks wrong at a glance and is not:
`localhost` in deployed code, a hardcoded literal, a comment that contradicts the diff.

## 3. What did I decide that you would not have?

Every judgement call made without asking. Naming them is the difference between Khairi
agreeing with a decision and discovering one.

## Where this came from

Three PRs went to review in one day — the AppConfig reader, the routing matrix and the
validator — and none of them changed anything when merged. The reader's `refresh()` had no
caller, `applyAvailability` had no caller, and the validator Lambda still ran a stub that
accepted everything. A reviewer asked "do we need this PR?" and Khairi had no answer,
because the answer was in a PR that did not exist yet.

The worst part was already knowing. The body written for one of them had a section headed
"Weak spot — nothing calls this yet". The problem was identified, labelled, and shipped
anyway, instead of being raised as a reason not to open the PR at all.

See also [[pr-plan-before-implementing]], [[simple-code]] and [[pr-body]].


## Code comments — short, and about why


Comment the **why**, and the **what** only when it is not obvious from the code.

Keep them short. One or two lines. A comment longer than the code it explains is a design
document in the wrong place — put it in the PR description or an RFC.

- Say why this choice, not what the line does
- Cut restatements of the code
- No multi-paragraph docblocks on ordinary functions

## Repository and service functions always get one

The rule above cuts comments that restate the code. It does not apply to functions in the
repository and service layers: those are read by people who did not write them, from a caller
that shows none of their reasoning, so every one carries a short docblock.

Give both halves, in this order:

- **What it does** — one plain sentence. The signature is not enough; say what question it
  answers or what it returns in words.
- **Why it works that way** — the choice a reader could otherwise get wrong: which timestamp
  it is anchored to, why a filter is missing, what a null return means, which sibling function
  to use instead.

Two or three lines total. Simple and direct, no ceremony.

```
/**
 * Did the consumer hold consent when this report was bought? Asking about the purchase date
 * rather than today means re-rendering an old report gives the same answer. Returns null when
 * the consumer cannot be identified, so callers must test `!== false`.
 */
```

Controllers, components, and private helpers stay under the general rule — comment them only
where the reasoning is not visible.

## Audit every comment before you commit

Comprehensible first, short second. Brevity that costs meaning is worse than the essay it
replaced — a reader who has to decode a comment would rather it were not there.

Read each comment you wrote, cold, as someone who has never seen the code. Then check:

- **Complete sentences.** No telegraphic fragments, no `null != "no consent"`, no bare
  `!== false` as the whole point. If you would not say it aloud, do not write it.
- **Names the thing it talks about.** "Anchored to `purchasedAt`" means nothing until the
  reader knows what question is being asked. State the question, then the answer.
- **No ticket ids.** `ENG-1234` means nothing to a reader a year later, and the comment
  should stand without it. Say the reason instead; the git history keeps the link.
- **Survives without the diff.** A comment explaining what a line *used to* do is dead the
  moment the PR merges.
- **Earns each line.** Three lines is the cap for a docblock, one or two for an inline
  comment. If it will not fit and still make sense, the reasoning belongs in the PR
  description and the comment should point there.

Failure mode to avoid: shortening in passes. Cutting an essay to a fragment, then padding the
fragment back, wastes a round trip each way. Write the three-line version that reads properly
the first time.


## Put new code in the file whose job it is


Every new type, constant or helper goes in the file whose job matches it, not the file that
happened to be open. Decide where it lives before writing it.

## Check before placing anything new

1. **Name the file's job in one line.** A schema file defines tables, columns and the
   validators for them. A repository reads and writes rows. A service holds business rules.
2. **Does the new thing fit that line?** If it is not a column, a table or a validator for one,
   it does not go in the schema file, even if it describes data stored there.
3. **Find where the repo keeps things like it.** Look for a shared types folder, a module that
   owns the concept, or a sibling file with the same kind of export. Follow that.
4. **Check who imports it.** If a lower layer (a repository) needs it, it cannot live in a
   higher layer (a service). Put it somewhere both can import, usually the shared types folder.

## Audit before saying a PR is ready

For each new export in the diff, read the file it is in and ask: *would a reviewer expect to
find this here?* If the answer needs a sentence of justification, move it.

## Where this came from

A union type saying "a quota usage row is charged to either an entitlement or a plan grant"
was added to a database schema file, because the metadata fields it described were there. It
was a plain type, not a column or a validator. A reviewer asked "is this related to schema?",
and it had to be moved to the shared types folder in a follow-up commit.

See also [[simple-code]] and [[use-what-the-repo-has]].


## Agree a PR before it exists


Never create a pull request without agreeing it first. Present what it contains, which repo,
what is deliberately left out, and how it relates to PRs already open — then wait for a yes.

The same applies to **closing** a PR, restructuring one, changing its base, and force-pushing.

Do the investigation. Write the plan. Then stop.

## An ambiguous reply is not agreement

The failure mode is not ignoring a refusal. It is reading approval into a short answer that
did not give it.

| Not agreement | Agreement |
|---|---|
| "please commit and push" after you offered three options | naming the option |
| "pr the fix" when "the fix" could mean two things | saying which fix, and where |
| silence on a plan you presented | a yes |

When a reply could mean two things and one of them opens a PR, ask which. One question costs
a message; the wrong PR costs a close, a branch deletion, and a reviewer wondering what
happened.

## Where this came from

Twice.

In August, eight PRs went up across two repos in one session and several were rebuilt as the
design moved — an S3 bucket PR opened and closed once the bucket turned out to exist only to
satisfy a module's interface, a stacks PR restructured twice, a module refactor overtaken
when a colleague merged his own version. Each step was defensible alone; together they were
churn Khairi had to keep reading and correcting. He said *"i cant let you let loose"*.

In September, after being told plainly *"dont change the code, change the .env"*, the `.env`
route turned out not to work. The right move was to report that and stop. Instead three
options went up, "please commit and pr the fix" was read as picking one, and a PR was opened
that had never been agreed. It was closed the same hour. The rule was loaded in context at
the time — as a one-line memory index entry, which is a hint rather than a rule, and it got
read past.

See also [[pr-plan-before-implementing]], [[never-touch-others-prs]] and [[brief-before-review]].


## Never touch another engineer's PR


Never modify a pull request that is not part of the work Khairi asked for. No exceptions, no
"it was obviously a typo", no tidying. This covers the title, the body, the base branch,
labels, reviewers, draft state, open/closed state, and comments — on open and closed PRs alike.

Ask first. Every time. Consent for one PR is not consent for the next one.

## Name the repository on every call

`gh` resolves a bare PR number against the current working directory. **PR numbers collide
across repositories**, so a number that means one thing in one repo means something else in
another, and `gh` reports no error either way.

Every `gh` invocation carries `--repo <org>/<repo>` explicitly. The working directory is never
the identification.

```
gh pr edit 360 --repo OneCreditMY/ssm-service --title "..."
```

Before any write to a PR — edit, close, merge, ready, comment — read it back first and confirm
the title matches the PR you mean.

## Where this came from

Three `gh pr edit` calls meant for ssm-service #360, #361 and #369 ran while the shell was in
`~/Documents/infrastructure`. Infrastructure has PRs with those same numbers, owned by other
engineers and already closed. All three titles were overwritten:
`DAT-1271: feat(secretsmanager): add litigation-api secrets` became
`feat(maintenance): read the maintenance document from the Agent (ENG-4570)`, and so on.

The originals were recovered from the `renamed` events in each PR's timeline
(`gh api repos/<org>/<repo>/issues/<n>/timeline`) and restored, but the edits still show in
three other engineers' PR histories.

See also [[discuss-prs-before-creating]] and [[pr-plan-before-implementing]].


## Don't post review comments on a colleague's unmerged PR


Don't post review comments on a colleague's unmerged PR; hand Khairi the text to raise himself

Don't post comments on a colleague's PR that hasn't merged, even after Khairi says "go" on a draft. Give him the text to raise directly.

**Why:** On 2026-10-05 I posted an approved comment on Thursy's oc-relationship-map #232. Khairi deleted it because "the pr has not merge yet".

**How to apply:** For other people's open PRs, record the point in the project tracker as "raise with <person>", and give Khairi the wording. Only post if he explicitly asks for it again. Related: [[review-questions-are-not-change-requests]], [[discuss-prs-before-creating]].


## PR bodies — plain words, and why before what


A PR body is read once, by a reviewer who was not in the conversation that produced it. Write
for that person. Plain words, short sections, and the reasoning in front of the detail.

Every body answers three questions, in this order:

| | |
|---|---|
| **Why** | What was wrong or missing before this. One or two sentences, first thing on the page |
| **What** | What changed. One line per file or per idea, not a diff summary |
| **How** | The decisions a reviewer could disagree with, each with the reason it went that way |

Nothing else is required. A body that answers the three and stops is finished.

## Plain words

Write it the way you would say it out loud. If a sentence needs a second read, rewrite it.

| Not this | This |
|---|---|
| which occurrence of a recurrence rule covers this instant | is a maintenance window running right now |
| precedence between the switches and the windows | can we call this provider, and if not, why |
| half-open intervals `[start, end)` | includes its start time but not its end time |
| parsing is now load-bearing | the document has to be parsed before this code runs |
| that would be circular | that would prove nothing |

Cut the vocabulary that only makes sense to whoever wrote the code: *derive, port, resolve,
precedence, canonical, load-bearing, trade-off, semantics*. Name the thing that happens instead.

## Say the decisions, not the diff

A reviewer can read the diff. What they cannot read is why a line went one way rather than the
other. Put each real decision in a two-column table — the decision, and the thing that goes
wrong without it.

Say what was **removed** and why, not only what was added. A deletion is the part a reviewer is
most likely to question.

End with what you know is weak. A named weakness reads as a decision; the same weakness found
by the reviewer reads as a miss. See [[simple-code]] for the delete test that finds them.

## No noise

Everything that is not why, what or how comes out. Noise is anything the reviewer will not act
on, and it hides the parts they should:

- **Numbers GitHub already shows** — file counts, line counts, test counts
- **Code blocks that repeat the diff.** Quote a snippet only when the body argues about that
  exact line and the argument fails without it
- **Explaining the tools** — what zod is, what an enum is, how `satisfies` works
- **Restating the ticket**, or restating the title in the first sentence
- **Sections that exist to look thorough** — verification checklists, "how to test" for
  something that has tests, screenshots of passing CI
- **Thanks, emoji, and credits.** Say who caught something only where it changes the reasoning
- **Reasoning that is already a code comment.** If the why sits at the line that needs it, the
  body names the decision in a clause and stops. Two copies drift, and the reviewer reads both

A minor change with no reasoning behind it needs no section. It is in the diff.

## Length

Most PRs need the why, the what, and nothing else. Two or three short sections is a normal
body; more than that usually means the diff is being narrated. If it does not fit on one
screen, the extra belongs in an RFC.

Write the short version first. Cutting a long body in passes wastes a round trip each way.

See also [[code-comments]] — same instinct, applied inside the file.


## Lay out the full PR plan before implementing


When asked to implement, first lay out the **complete PR plan** and wait for approval.
Do not start coding, branching, or opening PRs before it is agreed.

The plan states, for every PR:

| Field | Meaning |
|---|---|
| Branch and base | what it stacks on |
| Content | what changes, in one line |
| Order | merge or apply position, and what forces it |
| Dependency | what must land first, and why |

Also state what happens to **existing** PRs and branches: keep, rebase, re-cut, or close.

Rules:

- One PR per reviewable idea. Never bundle unrelated changes
- A PR that only exists to support another must say so, and name it
- Never open, close, or restructure a PR that was not in the approved plan
- If the plan turns out wrong mid-way, stop and re-plan rather than opening more PRs

**Why:** a wrong plan discovered after the branches exist means closing PRs, moving commits
between branches, and re-cutting work that was already reviewed. Checking a plan costs
minutes; unwinding a stack costs hours and confuses reviewers.

See also [[discuss-prs-before-creating]] and [[branch-naming]].


## Project state lives in one store — read it, refresh it, keep it current


Khairi's projects, their state and what is pending live in **`~/Documents/agent-projects`**.
That store is the single source for project facts. This knowledge base holds only how to work.

- **Read first.** When a project or "what's pending" comes up, read `INDEX.md`, then the project's
  `README.md` and `tasks.md`, before answering or changing anything. Follow its `RULES.md`.
- **Refresh after 14 days.** If a project's `Verified` date is more than 14 days old, re-check its
  live sources (PRs, `main`, the docs it links) and correct the files before relying on them. Until
  then, say plainly that its contents are unverified.
- **Keep it current.** When work moves — a task finishes, a decision lands, a PR opens or merges, a
  new task appears — update the project files in the same session, bump `Verified`, and tell
  Khairi in one line.
- **New work gets a project.** Anything that will span more than one session gets a folder and an
  `INDEX.md` row.
- **One copy.** Don't keep project state in agent memory, chat notes or a second tracker; point to
  the store.

## Where this came from

Pending work was spread across chat, agent memory and loose markdown files, so a new session or a
different agent started cold and Khairi had to re-explain where things stood. He asked for one
central place every agent reads, per-project knowledge to switch context with, and a refresh rule
so nothing older than two weeks is trusted unchecked.

See also [[due-diligence]].


## Show Khairi the diff and wait for a go before committing or pushing


Show Khairi the diff and wait for a go before committing or pushing — including follow-up fixes to PRs that already exist

Make the change locally, show the diff, and stop. Commit and push only after Khairi says so — even for small follow-ups on an existing PR (review fixes, config tweaks, merging one branch into another).

**Why:** 2026-09-30 he suggested a pattern change on ssm-service #448 mid-turn; I edited, committed, pushed, and merged it into #449 in one go. He said "dont commit yet" — too late, both were already pushed.

**How to apply:** a design suggestion from him ("follow something like this?") is a cue to edit and show, not to ship. Related: [[discuss-prs-before-creating]].


## Write simple code a mid-level engineer can read


Write the straightforward version. A junior or mid-level engineer should understand it on
first read, without tracing indirection.

- Prefer plain functions and plain data over classes, factories, and generics
- No abstraction until there are two real callers — not one and a guess
- Inline a helper used once
- Boring names over clever ones; early returns over nesting
- Clever code is a defect unless a measured requirement forces it

If something has to be intricate, say why in a short comment — see [[code-comments]].

## The delete test

Before adding a layer — a wrapper, a helper, a custom error, a file — delete it and ask:

> **Does the output change?**

If it does not, the layer does not ship. Same result without it means it buys nothing and
costs a reader a hop.

A layer passes only when you can **name the behaviour that changes** if it is removed: two
callers that would otherwise reject differently, a format an external contract requires, a
value that would be computed twice against a source that can move between the two reads.
"Cleaner", "more correct", "we might need it" are not behaviour.

Apply the test to your own diff before saying a PR is ready. Go through it piece by piece
asking what breaks if each one is deleted, and say plainly what you could not justify. If you
cannot defend a line, take it out rather than let a reviewer find it.

## Where this came from

A maintenance document parser shipped with a `MaintenanceDocumentError` class and a
`safeParse` wrapper that mapped zod issues into strings. A reviewer asked "do we really need
this file? we just need one single function which calls `documentSchema.parse`". He was right:
`.parse()` already throws with every issue attached, and `z.prettifyError()` already formats
them. The wrapper did more work and ended with less information. The failure was not writing
it — it was saying the PR was ready without having tried deleting it first, which left Khairi
defending the design in review on reasoning that did not hold.


## Use the library and the helper the repo already has


Before writing a utility, look for it. Check, in this order:

1. **A helper already in the repo** — `src/libs/`, `src/utils/`, a sibling module
2. **A package already in `package.json`** — installed and in use elsewhere
3. **Only then** write it

Hand-rolling something the repo already has costs twice: a reviewer has to read code that
did not need to exist, and the two copies drift.

## Constants too

A constant that already exists is not re-declared. Grep for the *value*, not the name — the
same string under a different name is still a duplicate, and the third copy is the one that
goes stale.

## Where this came from

`src/maintenance/window.ts` shipped an `Intl.DateTimeFormat` cache, a wall-clock-to-instant
converter with a two-pass offset trick, and day arithmetic through `Date.UTC` — about seventy
lines. `date-fns` and `date-fns-tz` were already dependencies, used in over twenty files in the
same service. `fromZonedTime`, `formatInTimeZone`, `addDays`, `getDay` and `format` replaced
all of it.

The same file also declared `OPS_TIME_ZONE = 'Asia/Kuala_Lumpur'`, which was the **third**
copy of that string — `MALAYSIA_TIME_ZONE` and `MY_TZ` were already there.

## Prove the swap, do not assume it

A library is not automatically right. Run the old and the new side by side across the edges
that matter and print the differences before committing.

For the window swap that meant every DST boundary, offsets that are not whole hours, and every
nth-weekday combination over two years — 33,600 of them. It found exactly one divergence, on
the repeated hour of a DST fall-back, which the ops zone never sees. Naming that one difference
is what made the change safe to review.

See also [[simple-code]] and [[due-diligence]].
