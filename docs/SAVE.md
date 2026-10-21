# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, UI font, shop-tab and similar preferences sit beside it as their own rows. Wiping the game keeps them, except the cat picked for the desk, which goes back to the default (the roster is found per run). The career body is the `SaveData` shape in `src/game/save.ts`, schema version 8:

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
- `activeBoost`, `foreverMult`, `tempMults`, `stats`, `seenMilestones` and `gold` (owned 10x dev skill ids) are optional. Unknown gold ids are dropped on load (the Bulk Buy skills, ids 1, 3 and 6, are gone), and a leftover `buyAmount` is ignored.
- There is no migration. A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes.
- On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours (12, 16 or 24 with the Time away gold skills). Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- `company` is the company's reach, optional and added without a version bump: `{ users, resistance, incidents, incidentSeq, won, uptime, day, hiredUsers }`. `users` is users by region id (each capped at what the region can hold), `resistance` 0 to 100, `incidents` the live ones `{ id, kind, region, until, strength }` (`kind` is `ddos`, `block`, `law` or `rival`), `incidentSeq` how many have been thrown so ids never repeat, `won` the latch at eight billion users, `uptime` one character per status day (`o` operational, `d` degraded, `p` partial outage, `m` major outage, newest last, 90 kept), and `day` the status day the last character belongs to. A malformed block is dropped on load, and so is one from before users and regions (it had `popularity` and `leads`): the company starts over.
- `hires` is the heads hired of each kind, optional and added without a version bump: `{ outsourced: 12, bootcamp: 3 }`. Ids are from `HIRES`, whole numbers of 1 to 10,000, left out at 0; anything else is dropped, and the old list format reads as nobody. It is written once someone is hired. Saves from before the fork was removed kept the hires in a `founder` block (`{ track, offered, bridges, equityCut, requitAt, broke, hires }`): the load reads `hires` from there and ignores every other field in it, so a founder-track save loads as a normal career with its product users kept.
- `combos` is the kitchen's found combos (`src/data/combos.ts`), optional and added without a version bump: an array of combo ids in the order they turned up (`["line-noise", "friday-deploy"]`). It is written only once one is found. The bonus is read from what is held, not from this list; the list is what the career log shows and what keeps each find journaled once. On load, an unknown id or a repeat is dropped (known ids are kept once, in table order), and a combo whose ingredients are already held but not listed (a save from before the kitchen) is found and journaled at boot. An Exit and `reset()` clear it with the rest of the career.
- `legacy` is prestige (the Exit, `docs/PRESTIGE.md`), optional and added without a version bump: `{ runs, prestige, prestigeTotal, earnedAllRuns, perks, endings }`. `runs` is careers started including the one under way (1 on a new save), `prestige` the spendable Prestige, `prestigeTotal` every Prestige ever earned (it drives the `1 + 0.03 × prestigeTotal` multiplier on income, XP and product growth, and never falls), `earnedAllRuns` the dollars earlier careers earned (this career's are `stats.lifetimeEarned`, which an Exit resets), `perks` the Legacy perk ids owned (`network.*`, `founder.*`, `capital.*`, `src/data/legacy.ts`) and `endings` the Hall of Fame (`nightOwl`, `sponsor`; a saved `founder` is dropped). Written only once it holds something. On load, an unknown perk id or ending is dropped (repeats are kept once, in table order), numbers are clamped finite and non-negative (`prestige` and `prestigeTotal` whole), `prestigeTotal` is at least `prestige`, and `runs` is at least 1. A save without the block is run 1 with no Prestige. An Exit also rewrites `company`, `footprint` and `hires` to a fresh product (and a new `profile.product` with `chosen: false`), and resets `foreverMult` (the win's multiplier included) to 1. `reset()` drops the block and the Hall of Fame with it.
- Keys this build does not know are ignored on load and never written. No version bump.
- `career` is the career timeline, optional and added without a version bump: `{ seq, log, unlocked, fresh, returns }`. `log` is the journal, newest 2,000 entries, each a tuple `[seq, at, type, ref, money, xpTotal, data?]` (`data` is a flat object of numbers, strings and booleans). `unlocked` is every timeline row already unlocked, in order, so each reveal plays once; `fresh` is the ones still marked NEW; `returns` counts comebacks after a break. `save.ts` only checks the shape (it is on the boot path); the store drops unknown row ids and journal types at boot (`src/game/careerSync.ts`, `src/game/careerLog.ts`), so a save that unlocked the retired `editor` and `terminal` rows boots without them and gets `studio` from its progress.
- `profile` is the career's handle and product (`{ handle, product, chosen }`), optional and added without a version bump. A fresh save draws one with `chosen: false`, which shows the start card until the player keeps it. On load, only a handle the word lists can draw is accepted, so a hand-edited save cannot put its own words on screen; any other field is dropped, and a bad handle makes boot draw again. `product` is the handle's animal in capitals plus one of eight suffixes (`Otterly`, `Otterbase`); on load any other value is replaced by a fresh draw, so a profile saved before products gets one with no version bump and keeps its `chosen`. A save from before this field gets one with `chosen: true`.
- A save from before the timeline has no `career`. Boot gives it every row its progress already opens, plus the desk cat it already had, quietly (no reveals, no NEW markers), backfills a short journal of what it holds, and shows one "What's new" card. A save with no progress at all starts a new journal instead.
- Hydrating a save that was put away at least 10 minutes earlier (`RETURN_BREAK_MS`) appends a `return` entry (`awayMs`, `creditedMoney`, `creditedXp`) and bumps `returns`.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
