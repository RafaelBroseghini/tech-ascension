# The progression tree

One data structure for what every row of the game needs, so that "what does this need" and "what does this open" are answered by walking nodes, not by knowing that gig `n` wants gig `n - 1`, or that a specialization's jobs sit at ids `100 × k + rank`. The code is `src/game/tree/`; this file is the model.

```
npm run tree                       the tracks, in order
npm run tree -- track gigs         one track, each row's gate in words
npm run tree -- job:14             one row: its gate, what it sits under, what it opens
npm run tree -- job:14 --xp 200000 --gigs 6 --jobs 1,2,3,4,5,6,7 --spec backend
                                   the same row against a career: ✓ holds, ✗ does not
__GAME__.explain("job:14")         the same, for the career under way (agents)
```

## Where things live

- **`src/data/tree.ts`** is the structure, written by hand: `GIG_PATH` lists the gigs in order with the skills (by tag) each one demands, and `JOB_PATHS` lists each track's jobs and what the track hangs off.
- **`src/data/phases.ts`** keeps the content: names, payouts, XP, prices and art. Its gates read from the paths.
- **`src/game/tree/graph.ts`** builds the nodes from the paths. **`check.ts`** evaluates a gate. **`index.ts`** walks the edges.
- **`src/game/phase.ts`** reads the tree for the three board gates. `oracle.ts` keeps the pre-tree rules as a test oracle; `treeEquivalence.test.ts` checks the two agree over whole careers.
- **The words** on the lock panels and the Next suggestion come from the tree too (`entry`, `short`, `neededPhrases` in `check.ts`).

The tree reads the per-row numbers from the rows themselves (gear's money and job gates, capital prices, each row's XP), and the boards' constants from `src/data/phases.ts`. The structure is what the tree owns.

Not on the tree: the career timeline's features (`src/data/features.ts` has its own trigger system), and what things cost. Affordability is not a gate: a row can be open and too dear.

## The shape

A **node** is one row of the game.

| Field | Meaning |
| --- | --- |
| `ref` | Its address: `skill:15`, `gig:3`, `job:108`, `gear:42`, `capital:6`, `board:jobs`, `pick:spec`, `gold:2` |
| `kind` | `skill`, `gig`, `job`, `gear`, `capital`, `board`, `pick`, `gold` |
| `track`, `index` | The track it sits on and its place in it |
| `after` | What it sits under: the row before it in its track, or the row its track hangs off. **Layout only.** |
| `requires` | The gate for acting on it (buy, clear, take, pick). **A hard rule.** |
| `reveal` | The gate for showing it, when that is looser than `requires`. Defaults to `requires`. |

A **track** is an ordered list of nodes with a `strict` flag.

- **Strict:** the order is also a gate. The 10x dev families are strict: a perk needs the ones before it.
- **Loose:** the order is only layout. Gigs, jobs, skills, gear and capital are loose: lifetime XP, money and the picks do the ordering.

Making a loose track strict is one flag plus an `owns` leaf per row. It would change play (the forced-XP recipes that `buyJob(14)` straight after `setXp` would stop working), so it is a design call, not a refactor.

### Requirements

`requires` is a small expression over what the career has. Leaves, composed with `all` and `any`:

| Leaf | Holds when |
| --- | --- |
| `xp` | lifetime XP is at least `min` |
| `owns` | every listed skill (or 10x dev perk) is owned |
| `has` | the career owns at least one row of a kind. **This is the latch.** |
| `count` | gigs cleared or jobs held is at least `min` |
| `tag` | at least `min` owned skills carry a tag. A gig's leaf has `mod: "gig"`, which lowers `min` on the career's own specialization tag (`gigTagMin`) |
| `rank` | the job rank held now, or before a switch, is at least `min` |
| `money` | the balance has reached `peak` at some point |
| `track` | the row is on the career's own specialization and line (others are hidden) |
| `picked` | the specialization or the leadership line is picked |
| `met` | another node's own `requires` holds (a board is open) |

### Reading a gate

`check(ref, career)` returns `{ met, missing }`: every unmet leaf, in the order the gate lists them, each with words and what the career has. `firstFail` returns just the first, and is how the old states are read: a job's state is the kind of its first unmet leaf. The order a gate lists its leaves in is part of the rules. `prereqs`, `dependents` and `closure` walk the edges.

## What each kind needs

| Kind | Gate |
| --- | --- |
| `skill` | lifetime XP at the row's `unlockAtXp` (the chain's computed value, not the raw table) |
| `gig` | its board; the XP; owned skills of each of its tags |
| `job` | the Job Board; the career's track and line; a picked specialization above the trunk (`TRUNK_TOP_RANK`); a picked line above `LEAD_NEEDED_ABOVE_RANK`; the XP |
| `gear` | the Gear tab's XP gate; the money held once; a job rank when the row has one |
| `capital` | the Capital gate: a senior job, the money gate, or any capital row owned. The row's price is held once to show it |
| `board:*` | gear: the Gear tab's XP gate, or any gear owned. Gigs: any gig cleared, or the XP and the two skills. Jobs: any job held, or the XP and the gigs. Capital: as above |
| `pick:spec` | a job at `TRUNK_TOP_RANK` |
| `pick:lead` | a job at `LEAD_OPEN_RANK` |
| `gold` | the earlier perks of its family, its XP, and for Hover Tap a senior job |

The thresholds are constants in `src/data/phases.ts`, `src/data/specializations.ts` and `src/data/leadership.ts`.

## Adding a branch

The structure is in `src/data/tree.ts`; the content is a row in the table. Both edits, and nothing else.

**A new gig.** Add its row to `GIG_ROWS` in `phases.ts` (name, XP, payout), then a step to `GIG_PATH` where it belongs in the order, with the skills it demands per tag:

```ts
{ id: 66, needs: [{ tag: "infra", min: 10 }, { tag: "product", min: 12 }] },
```

It needs no other gig: the order is how the board lists ties, nothing more.

**A new specialization's job track.** Add its rows to `JOB_ROWS` in `phases.ts`, then one path:

```ts
{ id: "quant", under: "trunk", spec: "quant", jobs: [608, 609, 610, 611, 612, 613, 614, 615] },
```

The track hangs off the trunk's last row, and its rows get the board, the track check, the pick and the XP from `jobGate` in `graph.ts`. `tree.test.ts` fails if a job is missing from every path, listed twice, out of rank order, or on a path whose `spec` is not its own.

**A tagged gig** is how every gig reads. Its step in `GIG_PATH` carries tag counts, and `graph.ts` writes `{ t: "tag", tag, min, mod: "gig" }` leaves for them. The evaluator counts owned skills per tag and lowers `min` for the career's specialization.

**A new gate on an existing row** is one leaf in its `all` in `graph.ts`, for example a row that waits on a pick: `{ t: "picked", of: "spec" }`.

## One decision this leaves open

**Should the job ladder be strict?** Today a Senior SWE needs XP, the board and the pick, not the job before it. Making each rank need the one before it makes the ladder a path in the literal sense and gives the shop an unambiguous "next", at the cost of the forced-XP shortcuts in tests and agent recipes.
