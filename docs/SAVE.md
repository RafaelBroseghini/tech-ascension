# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, shop-tab and similar preferences sit beside it as their own rows. Wiping the game keeps them, except the cat picked for the desk, which goes back to the default (the roster is found per run). The career body is the `SaveData` shape in `src/game/save.ts`, schema version 8:

```json
{
  "version": 8,
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
- `activeBoost`, `foreverMult`, `tempMults`, `stats`, `seenMilestones` and `gold` (owned 10x dev skill ids) and `buyAmount` (the shop Buy control, omitted at ×1) are optional. Unknown gold ids are dropped on load, and `buyAmount` is held to what the owned gold skills unlock.
- There is no migration. A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes.
- On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours (12, 16 or 24 with the Time away gold skills). Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- `career` is the career timeline, optional and added without a version bump: `{ seq, log, unlocked, fresh, returns }`. `log` is the journal, newest 2,000 entries, each a tuple `[seq, at, type, ref, money, xpTotal, data?]` (`data` is a flat object of numbers, strings and booleans). `unlocked` is every timeline row already unlocked, in order, so each reveal plays once; `fresh` is the ones still marked NEW; `returns` counts comebacks after a break. `save.ts` only checks the shape (it is on the boot path); the store drops unknown row ids and journal types at boot (`src/game/careerSync.ts`, `src/game/careerLog.ts`), so a save that unlocked the retired `editor` and `terminal` rows boots without them and gets `studio` from its progress.
- `profile` is the career's handle (`{ handle, chosen }`), optional and added without a version bump. A fresh save draws one with `chosen: false`, which shows the start card until the player keeps it. On load, only a handle the word lists can draw is accepted, so a hand-edited save cannot put its own words on screen; any other field is dropped, and a bad handle makes boot draw again. A save from before this field gets one with `chosen: true`.
- `interviews` is the whiteboard interviews engaged with (asked about, nudged, hinted, submitted, forced or practiced), optional: `{ [interviewId]: { verdict, attempts, design, best?, asked, nudges, hints, offer?, stars, studied } }`, written only when it has a record. `verdict` is `noHire`, `hire`, `strongHire` or `null` (null until the first real Submit; a held job from a save before interviews gets a record on its first practice run with a null verdict, 0 attempts and an empty design), `attempts` counts every submission, and `design` is the last design sent (`{ nodes, edges }`). `best` is the cheapest passing run, real or practice, with p95 as the tiebreak: `{ design, costPerMonth, p95Ms }`. Only `hire` and `strongHire` count as a pass. `asked` is the question ids asked, in order (`traffic`, `features`, `mix`, `fresh`, `durable`, `later`, `cache`, `fanout`, `speed`, `uptime`, `budget`, `lag`, `faults`), `nudges` the targets a nudge was taken for, and `hints` the paid hint lines taken, in order, so a retry shows the same hints the player paid for (the count is the array's length). `offer` is `{ band: "top" | "mid" | "bottom", bonus }`, set once by the Submit that first passed and never changed; `bonus` is a one-time cash lump, above 0 only for the top band. `stars` is the most stars any run earned, real or practice (0 to 3: works, meets the targets, under half the budget), and `studied` is whether the player has opened the engineers' board after a pass. Version 6 added the null verdict and `best`; version 7 added `asked`, `nudges`, `hints` and `offer`; version 8 added `stars` and `studied`, moved the scenario from a request mix to user-story features, and made a design's wires follow the call table (an edge the table forbids is dropped on load). On load, an interview id the catalog (`src/data/studio/challenges.ts`) does not have and a verdict, question or target outside the set are dropped, a repeated question or target is kept once, an `offer` with a band outside the set or no bonus is dropped, a malformed design becomes an empty one, and a `best` with missing numbers or no component is dropped. A save from before interviews has none: a job it already holds, and every interview at or below the highest gated job it holds, count as passed (`interviewPassed` in `src/game/studio/interviews.ts`), so it never re-locks.
- A save from before the timeline has no `career`. Boot gives it every row its progress already opens, plus the desk cat it already had, quietly (no reveals, no NEW markers), backfills a short journal of what it holds, and shows one "What's new" card. A save with no progress at all starts a new journal instead.
- Hydrating a save that was put away at least 10 minutes earlier (`RETURN_BREAK_MS`) appends a `return` entry (`awayMs`, `creditedMoney`, `creditedXp`) and bumps `returns`.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
