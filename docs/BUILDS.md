# Builds: specializations, leadership, tags and the kitchen

Status: the job ladder is a tree (a specialization, then a leadership line). Gigs ask for skills by tag. The kitchen's combos work in the rules and the state, but have no panel yet. The progression tree models every gate ([TREE.md](TREE.md)). The origins and the company arc were removed; the last section says what went.

## Why

Every career walked the same line, and the rules made it so, not the content. Jobs were one ladder, all held at once; gigs were a chain; gear and capital opened in table order. A build breaks that up. A career picks a specialization once and a leadership line once, and does not see the rows of the ones it did not pick. Two careers now feel different, and the endgame has a choice in it.

## Decided

- **Builds come from exclusivity.** A career does not see the rows of the specialization or line it did not pick.
- **Three pieces:** specialization branches on the job ladder, gigs that ask for tags, and the kitchen (combos with hand-written jokes).
- **The specialization is picked once**, at Mid-level SWE, and is then locked. A career gets one switch.
- **Click builds stay.** Some specializations earn by clicking, some by idle income.
- **A career takes half a day to a day of real time** and well under two hours at the game (`docs/PACING.md`).
- **Jokes are clean.** Tech humour, the 2026 industry and programming lore. No obscenity, no swearing, no punching at people.

## 1. Specializations and leadership

The job ladder is a tree.

1. **Trunk.** The internship, then the rungs up to Mid-level SWE. Shared by everyone.
2. **Specialization.** At Mid-level the Job Board offers the specializations. Taking one hides the others for the career. Each has its own track of rows above the trunk.
3. **Leadership.** At Senior, two ways up: an individual-contributor line (staff, principal, fellow) and a manager line (EM, director, VP, CTO). The pick is locked; a specialization switch keeps it.

| Specialization | Style |
| --- | --- |
| Frontend | click |
| Backend / Platform | balanced |
| Infra / SRE | idle |
| AI engineer | idle |
| Forward deployed engineer | click |
| Security | balanced |

The names, tags, row ids and ranks are in `src/data/specializations.ts`, `src/data/leadership.ts` and `src/data/phases.ts`.

**Click or idle.** This is the build's answer to the endgame. A click build's manual click is worth more than the plain ladder's, so with every row its build can see held, a click pays a multiple of the idle $/s, and clicking a few minutes is worth a good chunk of idle time. Hover clicks and auto-clicks are not multiplied. An idle build earns more from every source, offline included, and gets less from clicks. The reason: a player who clicks should be rewarded more than one who leaves the game open, and an idle build should be rewarded for not clicking. The multipliers and their tuning are in `src/game/build.ts`, which also says where the tuning is still open.

## 2. Tags and the gig board

Every skill, gig, job and gear row carries one or more tags. Adding a tag is a data edit, and most skill names already say their tag.

Gigs drop the chain. Each one asks for tag counts on its own tags instead of every earlier gig and a skill prefix, so two players who learned different skills meet different clients. The specialization lowers the count on its own tag, and no ask goes below one. The board lists the cleared gigs and only the next gig in catalog order. The counts are in `GIG_PATH` (`src/data/tree.ts`); the rule is `gigTagMin` (`src/game/tree/check.ts`).

## 3. The kitchen

Owning two things that go together reveals a **combo**: a name, a one-line joke and a small effect. It works like Emoji Kitchen: mix two things you have, and something you did not expect shows up.

**Built:**

- **Data.** A drop-in table, `src/data/combos.ts`: `{ id, a, b, name, joke, effect }`, where `a` and `b` are a row, a tag or a specialization. Hand-written and sparse. No rule generates combos, so every one is a joke someone wrote.
- **Effects.** Each is a small percentage on idle $/s, on click, or on idle XP/s. They add together, not compound, and each kind is capped (`COMBO_CAP_PCT`). The bonus is read from what is held, so an Exit and `reset()` clear it by construction.
- **Finding.** A combo is found the moment both ingredients are held, journaled once, and saved as a list of found ids.
- **Voice.** Clean tech humour: the industry now (agents, vibe coding, context windows, GPU queues) and programming lore (DNS, off-by-one, left-pad, Bobby Tables, "works on my machine"). A test scans every name and joke against a word list, the way handles are scanned.

**Not built yet:**

- A kitchen panel, with a `???` slot for each combo the build can still make. Read `getState().combos` for now.
- Gig-board or LinkedOut effects, and cosmetic effects. Only the three income kinds above exist.
- Combo art. `emojiManifest.json` is generator-only, so combo art will have to come from the generator; for a start, the two parents side by side.

## Removed

- **Origins** (College, Bootcamp, Dropout): the start card's first choice, with prices and gate changes of their own. Every career plays the plain ladder.
- **The company**: the globe, users, regions, incidents, hires, product revenue, and the win. The Company tab and its Legacy track went with it. Gear keeps its $/s and click bonus.
- **The user gates**: the pick opens on holding Mid-level SWE, and Senior SWE needs only its XP and the pick.

## Open

- A leadership switch.
- An IC effect beyond its rows.
- Tuning each build against a target. A click build's fully held multiple lands below the design target, because a career holds one line only (see the comment on `FULL_CLICK_SHARE` in `src/game/build.ts`).
- Save slots.
