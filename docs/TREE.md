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

**Built (step 1):** a faithful model. `src/game/tree/graph.ts` reads today's tables once and writes the edges down
explicitly. `gigState`, `jobState` and the three board gates in `src/game/phase.ts` now read the tree. A test
(`treeEquivalence.test.ts`) runs the rules as they were written before the tree (`oracle.ts`) against the tree at
every round of the shop, over every specialization, both leadership lines and all three origins, for two player
profiles, and fails on the first row that differs. Nothing about play changed.

**Not built yet (step 2):** moving the *authoring* into the tree. Today the tables still say `priorGigs: id - 1`,
`skillsForGig(id)`, `unlockJobRank`, and the tree decodes them. Step 2 turns that round: the tree is written by hand,
and the tables read their edges from it. Until then, adding a branch means touching the table and `graph.ts`; after,
it means one entry here. The shop's `needs` text, `nextUnlock` and the career timeline's progress bars still have
their own code and are the follow-ups (`explain` is the replacement for all three).

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

The point of the tree is that these are edits in one place. Two examples as they will read once authoring moves in
(step 2); today the same edit goes in the table and in `graph.ts`.

**A new specialization's job track.** A track of jobs that hangs off the trunk's top, each row on the shared gate:

```ts
track("jobs:quant", "Jobs: Quant", false, rows.map(jobNode), trunkTop)
```

Its rows get the board, the track check, the pick, the XP and (at rank 14) the users gate for free from `jobGate`.

**A tagged gig** (the planned gig board). A gig stops asking for "every gig before it and the first n skills" and asks
for what it is about:

```ts
{
  ref: "gig:70", kind: "gig", id: 70, name: "Design-system migration",
  requires: all(
    { t: "met", ref: "board:gigs" },
    { t: "xp", min: 30_000, mod: "gig" },
    { t: "tag", tag: "frontend", min: 3 },
    { t: "tag", tag: "backend", min: 1 },
  ),
}
```

Nothing else changes: the shop, the state labels, `npm run tree` and `explain` all read the same node.

**A new gate on an existing row** is one leaf in its `all`, for example a row that waits on a pick:
`{ t: "picked", of: "spec" }`.

## Two decisions this leaves open

1. **Should the job ladder be strict?** Today a Senior SWE needs XP, the board, the pick and the users, not the job
   before it. Making each rank need the one before it makes the ladder a path in the literal sense and gives the
   shop an unambiguous "next", at the cost of the forced-XP shortcuts in tests and agent recipes.
2. **When does authoring move into the tree?** Step 2 is mechanical now that the equivalence test exists; it is the
   step that makes "add a path" a one-entry change.
