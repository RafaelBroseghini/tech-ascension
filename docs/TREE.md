# The progression tree

One data structure for what every row of the game needs, so that "what does this need" and "what does this open" are
answered by walking nodes, not by knowing that gig `n` wants gig `n - 1`, that a specialization's jobs sit at ids
`100 × k + rank`, or that gear opens on `unlockMoney` and `unlockJobRank`. The code is `src/game/tree/`; this file is
the model.

```
npm run tree                       the tracks, in order
npm run tree -- track gigs         one track, each row's gate in words
npm run tree -- job:14             one row: its gate, what it sits under, what it opens, everything it needs
npm run tree -- job:14 --xp 200000 --gigs 6 --jobs 1,2,3,4,5,6,7 --spec backend --users 5000
                                   the same row against a career: ✓ holds, ✗ does not
__GAME__.explain("job:14")         the same, for the career under way (agents)
```

## Status: what is built and what is not

**Built:** the model (`src/game/tree/`), the structure written by hand (`src/data/tree.ts`), and the check that they are
the same game as before.

- **`src/data/tree.ts` is where the structure is authored.** `GIG_PATH` lists the gigs in order and the skills each one
  demands; `JOB_PATHS` lists each track's jobs and what the track hangs off. The tables (`phases.ts`) keep content
  (names, payouts, XP, prices, art) and read `priorGigs` and `skillIds` off the path; `graph.ts` builds the nodes from
  the paths. The id arithmetic is gone: no `priorGigs: id - 1`, no `skillsForGig(id)`, no job tracks decoded from `spec`
  and `rank` fields.
- **The tree reads the rest from the rows:** gear's `unlockMoney` and `unlockJobRank`, capital's price, a gig's and a
  job's `xpReq`, the boards' constants (`GIG_BOARD_UNLOCK` and friends). These are per-row numbers, not structure.
- `gigState`, `jobState` and the three board gates in `src/game/phase.ts` read the tree. The pre-tree rules are kept
  word for word as `oracle.ts`, and `treeEquivalence.test.ts` runs both at every round of the shop, over every
  specialization, both leadership lines and all three origins, for two player profiles, and fails on the first row that
  differs. `tree.test.ts` checks the hand-written structure against the rows (every gig and job listed once, ranks
  rising along a track, a track's `spec` and `lead` matching its jobs'). Nothing about play changed.

- **The words come from the tree too.** The shop's lock panels (`gigBoardRequirements` and the others in `phase.ts`) are
  `entry(board)`: the board's entering leaves, in order, each with what the career has and whether it holds, with the
  latch left out and the capital's two ways in returned as alternatives. The "Next" banner (`nextUnlock.ts`) says the
  same leaves in its few words (`short`, `neededPhrases`, `entryPhrases`): "more XP", "more gigs", "a bigger balance",
  the skills still missing, the job needed. A leaf can carry its own `label` where the default does not read right.
  One fix came with it: the Gig Board's banner used the plain XP number, ignoring the career's origin; it now reads the
  origin-scaled one like the gate does.

**Not built yet:** the career timeline's progress bars (`features.ts`) weigh their own fills and still have their own
code. The tagged gig board, which changes gameplay, is a data edit on this tree (below) and has not been made.

**Left out on purpose:** the career timeline's features (`src/data/features.ts`, its own trigger system), hire kinds,
and what things cost (affordability is not a gate: a row can be open and too dear).

## The shape

A **node** is one row of the game.

| Field | Meaning |
| --- | --- |
| `ref` | Its address: `skill:15`, `gig:3`, `job:108`, `gear:42`, `capital:6`, `board:jobs`, `pick:spec`, `gold:2` |
| `kind` | `skill`, `gig`, `job`, `gear`, `capital`, `board`, `pick`, `gold` |
| `track`, `index` | The track it sits on and its place in it |
| `after` | What it sits under: the row before it in its track, or the row its track hangs off. **Layout.** |
| `requires` | The gate for acting on it (buy, clear, take, pick). **A hard rule.** |
| `reveal` | The gate for showing it in the shop, when that is looser than `requires`. Defaults to `requires`. |

A **track** is an ordered list of nodes with a `strict` flag.

- **Strict:** the order is also a gate. The gigs are strict (each needs every earlier gig cleared), and so is each
  10x dev family (a perk needs the ones before it).
- **Loose:** the order is only layout. The jobs, the skills, the gear and the capital are loose: nothing demands the
  row before it; lifetime XP, money and the picks do the ordering.

Making a loose track strict is one flag plus an `owns` leaf per row. It would change play (the forced-XP recipes that
`buyJob(14)` straight after `setXp` would stop working), so it is a design call, not a refactor.

### Requirements

`requires` is a small expression over what the career has. Leaves, composed with `all` and `any`:

| Leaf | Holds when |
| --- | --- |
| `xp` | lifetime XP ≥ `min`, scaled by the career's origin where `mod` says so (`gig`, `job`, `gigBoard`) |
| `owns` | every listed skill (or 10x dev perk) is owned |
| `has` | the career owns at least one row of a kind. **This is the latch**: holding what a gate leads to keeps it open |
| `count` | gigs cleared or jobs held ≥ `min` (the Job Board's gig count is scaled by origin) |
| `tag` | at least `min` owned skills carry a tag (the tagged gig board is written with this) |
| `rank` | the job rank held now **or before a switch** is ≥ `min` |
| `users` | the product has ≥ `min` users; a caller that carries no company leaves it open |
| `money` | the balance has reached `peak` at some point |
| `track` | the row is on the career's own specialization and line (others are hidden) |
| `picked` | the specialization or the leadership line is picked |
| `met` | another node's own `requires` holds (a board is open) |

Values with modifiers (the origin's XP and gig counts) are stored as their plain numbers with a `mod`, and computed
through the same helpers the game uses (`gigXpReq`, `jobXpReq`, `gigBoardXp`, `jobBoardGigs` in `src/game/origin.ts`),
so the tree and the rest of the game cannot disagree.

### Reading a gate

`check(ref, career)` returns `{ met, missing }`: every unmet leaf, in the order the gate lists them, each with words and
what the career has. `firstFail` returns just the first, and is how the old states are read: a job's state is the kind
of its first unmet leaf (`met` → board-locked, `track` → hidden, `picked` → pick or lead, `xp` → locked, the users
`any` → users). The order a gate lists its leaves in is therefore part of the rules. `prereqs`, `dependents` and
`closure` walk the edges (a row's `after` plus every row its gate names).

## What each kind needs today

| Kind | Gate |
| --- | --- |
| `skill` | lifetime XP at the row's `unlockAtXp` (the chain's computed value, not the raw table) |
| `gig` | its board; the XP (origin-scaled); `priorGigs` gigs cleared; the skills for it |
| `job` | the Job Board; the career's track and line; a picked specialization above rank 7; a picked line above rank 15; the XP (origin-scaled); for rank 14, a job of rank 14 already held or 1,000,000 users |
| `gear` | the Gear tab; the money held once; a job rank when the row has one |
| `capital` | Capital (rank 14, $500,000 held, or any capital row owned); the row's price held once to show it |
| `board:*` | gear: 10,000 XP or any gear owned. gigs: any gig cleared, or the XP and skills 15 and 16. jobs: any job held, or 40,000 XP and the gigs (origin-scaled). capital: as above |
| `pick:spec` | a Mid-level job and, until a job above it is held, 10,000 users |
| `pick:lead` | a Senior job |
| `gold` | the earlier perks of its family, its XP, and for Hover Tap a Senior job |

## Adding a branch

The structure is in `src/data/tree.ts`; the content is a row in the table. Both edits, and nothing else.

**A new gig.** Add its row to `GIG_ROWS` in `phases.ts` (name, XP, payout) and a step to `GIG_PATH` where it belongs in
the order, with the skills it demands:

```ts
{ id: 66, skills: skills(1, 71) },
```

It sits under the step before it and needs every earlier gig cleared, because the gig path is strict.

**A new specialization's job track.** Add its eight rows to `JOB_ROWS` (ids `600 + rank`, `spec: "quant"`), then one
path:

```ts
{ id: "quant", under: "trunk", spec: "quant", jobs: [608, 609, 610, 611, 612, 613, 614, 615] },
```

The track hangs off the trunk's last row, and its rows get the board, the track check, the pick, the XP and (at rank
14) the users gate from `jobGate` in `graph.ts`. `tree.test.ts` fails if a job is missing from every path, listed
twice, out of rank order, or on a path whose `spec` is not its own.

**A tagged gig** (the planned gig board). A gig stops asking for "every gig before it and the first n skills" and asks
for what it is about. Its step in `GIG_PATH` carries tag counts where it now carries a skill list, and `graph.ts` writes
`{ t: "tag", tag, min }` leaves instead of an `owns` leaf. The evaluator already counts tags, so nothing else changes:
the shop, the state labels, `npm run tree` and `explain` read the same node.

**A new gate on an existing row** is one leaf in its `all` in `graph.ts`, for example a row that waits on a pick:
`{ t: "picked", of: "spec" }`.

## Two decisions this leaves open

1. **Should the job ladder be strict?** Today a Senior SWE needs XP, the board, the pick and the users, not the job
   before it. Making each rank need the one before it makes the ladder a path in the literal sense and gives the
   shop an unambiguous "next", at the cost of the forced-XP shortcuts in tests and agent recipes.
2. **The tagged gig board**, the first gameplay change the tree is meant to carry. It replaces a gig's skill-id prefix
   with tag counts and drops the strict chain, so two players who learned different skills meet different clients.
