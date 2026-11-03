# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, UI font, shop-tab and similar preferences sit beside it as their own rows. Wiping the game keeps them, except the desk cat, which goes back to the default.

The career body is the `SaveData` shape in `src/game/save.ts`. Its `version` is `SAVE_VERSION`. The shape below is illustrative; the type is the source of truth.

```json
{
  "version": 9,
  "money": 0,
  "xp": 0,
  "xpTotal": 0,
  "skills": { "1": 2 },
  "equipment": { "1": 1 },
  "owned": { "1": 1 },
  "jobs": [1, 2],
  "gigs": [1, 2, 3],
  "savedAt": 0,
  "peakMoney": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 }
}
```

- `equipment` is the Gear tab. `owned` is the capital rows. `peakMoney` is required.
- `activeBoost`, `foreverMult`, `tempMults`, `stats`, `seenMilestones`, `gold` (owned 10x dev skill ids) and the blocks below are optional. Unknown gold ids are dropped on load.
- **No migration.** A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes. Keys this build does not know are ignored on load and never written, so adding an optional block needs no bump.
- On load, `activeBoost` and ended `tempMults` are dropped once their end time has passed.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at the offline cap. Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- **`build`** is the career's specialization and leadership line (`src/game/build.ts`), optional: `{ spec, switched, peakRank?, leadership? }`. It is left out until the pick. On load an unknown `spec` is dropped, and jobs of other tracks are dropped when a `spec` is known. A save with no `build` that holds a job above the trunk was on the plain ladder and loads as Backend. `peakRank` (the rank held before a switch) keeps capital open and gear revealed. `leadership` is left out until the pick after Senior; an unknown id is dropped, and a save with no line takes one from the rows it holds. `reset()` and an Exit drop the block.
- **`combos`** is the kitchen's found combos, optional and added without a version bump: an array of combo ids in the order they turned up. The bonus is read from what is held, not from this list; the list keeps each find journaled once. On load an unknown id or a repeat is dropped, and a combo whose ingredients are held but not listed is found and journaled at boot.
- **`legacy`** is Prestige, optional: `{ runs, prestige, prestigeTotal, earnedAllRuns, perks }`. `runs` counts careers started, including the one under way. `prestige` is the spendable Prestige. `prestigeTotal` is every Prestige ever earned, and it never falls. `earnedAllRuns` is the dollars earlier careers earned; this career's are `stats.lifetimeEarned`, which an Exit resets. `perks` are the Legacy perk ids owned. On load, an unknown perk id is dropped, numbers are clamped finite and non-negative, `prestigeTotal` is at least `prestige`, and `runs` is at least 1. A save without the block is run 1 with no Prestige. An Exit resets `foreverMult` to 1 and keeps the `profile` kept. `reset()` drops the block. The rules are in [PRESTIGE.md](PRESTIGE.md).
- **`career`** is the career timeline, optional: `{ seq, log, unlocked, fresh, returns }`. `log` is the journal, newest entries kept, each a tuple `[seq, at, type, ref, money, xpTotal, data?]`, where `data` is a flat object of numbers, strings and booleans. `unlocked` is every timeline row already unlocked, in order, so each reveal plays once. `fresh` is the ones still marked NEW. `returns` counts comebacks after a break. `save.ts` only checks the shape, since it is on the boot path; the store drops unknown row ids and journal types at boot (`src/game/careerSync.ts`, `src/game/careerLog.ts`).
- A save from before the timeline has no `career`. Boot gives it every row its progress already opens, plus the desk cat it already had, quietly (no reveals, no NEW markers), backfills a short journal of what it holds, and shows one "What's new" card. A save with no progress at all starts a new journal instead.
- Hydrating a save that was put away at least `RETURN_BREAK_MS` earlier appends a `return` entry and bumps `returns`.
- **`profile`** is the career's handle (`{ handle, chosen }`), optional. A fresh save draws one with `chosen: false`, which shows the start card until the player keeps it. On load, only a handle the word lists can draw is accepted; a bad handle makes boot draw again. A save from before this field gets one with `chosen: true`.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
