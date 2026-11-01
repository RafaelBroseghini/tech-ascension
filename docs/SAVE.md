# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, UI font, shop-tab and similar preferences sit beside it as their own rows. Wiping the game keeps them, except the cat picked for the desk, which goes back to the default (the roster is found per run). The career body is the `SaveData` shape in `src/game/save.ts`, schema version 8:

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

- `equipment` is the Gear tab. `owned` is the Phase D capital rows. `peakMoney` is required.
- `activeBoost`, `foreverMult`, `tempMults`, `stats`, `seenMilestones` and `gold` (owned 10x dev skill ids) are optional. Unknown gold ids are dropped on load (the Bulk Buy skills, ids 1, 3 and 6, are gone), and a leftover `buyAmount` is ignored.
- There is no migration. A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes. Version 9 dropped the company, footprint, hires and origin fields and the product name; a version 8 save is wiped.
- On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours (12, 16 or 24 with the Time away gold skills). Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- `build` is the career's specialization and leadership line (`src/game/build.ts`), optional: `{ spec, switched, peakRank?, leadership? }`. `spec` is `frontend`, `backend`, `infra`, `ai`, `fde` or `security`; `switched` is true once the career's one switch is used; `peakRank` is the highest job rank held before a switch dropped the old track (it keeps capital open and gear revealed), left out unless a switch happened. Left out entirely until the pick. On load an unknown `spec` is dropped, `peakRank` is clamped to 0-31, and jobs of other tracks are dropped when a `spec` is known. A save with no `build` that holds a job above rank 7 was on the plain ladder and loads as Backend (`spec: "backend"`; job ids 8-15 keep their meaning); one that holds another track's row takes that track. `leadership` is `ic` or `manager`, left out until the pick after Senior; an unknown id is dropped. A save with no `leadership` that holds a job above rank 15 takes one: `manager` when it holds a manager-only row (ids 18, 20, 21, 22) and no IC-only row (ids 16, 17, 19, 23, 24), `ic` otherwise; jobs of the other line are dropped. `reset()` and an Exit drop the block.
- `combos` is the kitchen's found combos (`src/data/combos.ts`), optional and added without a version bump: an array of combo ids in the order they turned up (`["line-noise", "friday-deploy"]`). It is written only once one is found. The bonus is read from what is held, not from this list; the list is what the career log shows and what keeps each find journaled once. On load, an unknown id or a repeat is dropped (known ids are kept once, in table order), and a combo whose ingredients are already held but not listed (a save from before the kitchen) is found and journaled at boot. An Exit and `reset()` clear it with the rest of the career.
- `legacy` is prestige (the Exit, `docs/PRESTIGE.md`), optional: `{ runs, prestige, prestigeTotal, earnedAllRuns, perks }`. `runs` is careers started including the one under way (1 on a new save), `prestige` the spendable Prestige, `prestigeTotal` every Prestige ever earned (it drives the `1 + 0.03 × prestigeTotal` multiplier on income and XP, and never falls), `earnedAllRuns` the dollars earlier careers earned (this career's are `stats.lifetimeEarned`, which an Exit resets) and `perks` the Legacy perk ids owned (`network.*`, `capital.*`, `src/data/legacy.ts`). Written only once it holds something. On load, an unknown perk id is dropped (repeats are kept once, in table order), numbers are clamped finite and non-negative (`prestige` and `prestigeTotal` whole), `prestigeTotal` is at least `prestige`, and `runs` is at least 1. A save without the block is run 1 with no Prestige. An Exit resets `foreverMult` to 1 and keeps the `profile` kept. `reset()` drops the block.
- Keys this build does not know are ignored on load and never written. No version bump.
- `career` is the career timeline, optional and added without a version bump: `{ seq, log, unlocked, fresh, returns }`. `log` is the journal, newest 2,000 entries, each a tuple `[seq, at, type, ref, money, xpTotal, data?]` (`data` is a flat object of numbers, strings and booleans). `unlocked` is every timeline row already unlocked, in order, so each reveal plays once; `fresh` is the ones still marked NEW; `returns` counts comebacks after a break. `save.ts` only checks the shape (it is on the boot path); the store drops unknown row ids and journal types at boot (`src/game/careerSync.ts`, `src/game/careerLog.ts`), so a save that unlocked the retired `editor` and `terminal` rows boots without them and gets `studio` from its progress.
- `profile` is the career's handle (`{ handle, chosen }`), optional. A fresh save draws one with `chosen: false`, which shows the start card until the player keeps it. On load, only a handle the word lists can draw is accepted, so a hand-edited save cannot put its own words on screen; any other field is dropped, and a bad handle makes boot draw again. A save from before this field gets one with `chosen: true`.
- A save from before the timeline has no `career`. Boot gives it every row its progress already opens, plus the desk cat it already had, quietly (no reveals, no NEW markers), backfills a short journal of what it holds, and shows one "What's new" card. A save with no progress at all starts a new journal instead.
- Hydrating a save that was put away at least 10 minutes earlier (`RETURN_BREAK_MS`) appends a `return` entry (`awayMs`, `creditedMoney`, `creditedXp`) and bumps `returns`.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
