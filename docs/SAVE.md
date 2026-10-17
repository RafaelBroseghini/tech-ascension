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
- `company` is the company's reach, optional and added without a version bump: `{ users, resistance, incidents, incidentSeq, won, uptime, day }`. `users` is users by region id (each capped at what the region can hold), `resistance` 0 to 100, `incidents` the live ones `{ id, kind, region, until, strength }` (`kind` is `ddos`, `block`, `law` or `rival`), `incidentSeq` how many have been thrown so ids never repeat, `won` the latch at seven billion users, `uptime` one character per status day (`o` operational, `d` degraded, `p` partial outage, `m` major outage, newest last, 90 kept), and `day` the status day the last character belongs to. A malformed block is dropped on load, and so is one from before users and regions (it had `popularity` and `leads`): the company starts over.
- `founder` is the fork, optional and added without a version bump: `{ track, offered, bridges, equityCut, requitAt, broke, hires }`. `track` is `ladder` or `founder`; `offered` latches once the fork's card has shown (and the red button is always there from then on); `bridges` is 0 to 3 and `equityCut` is at most 0.1 per bridge, the share of product revenue given up for good on either track; `requitAt` is the users needed before quitting is allowed again after a return to a job (null otherwise, and only kept on the ladder); `broke` is true while the out-of-runway choice is open (only kept on the founder track). It is written once `offered` is true and omitted before, so a ladder career that never saw the fork has none. `hires` is the heads hired of each kind, `{ outsourced: 12, bootcamp: 3 }`: ids from `HIRES`, whole numbers of 1 to 10,000, left out at 0; anything else is dropped, and the old list format reads as nobody. A malformed block is dropped on load, and a founder block always reads as offered. The "Go full-time?" card being open is session state and is not saved.
- Saves from the retired whiteboard may still carry an `interviews` key; it is ignored on load and never written. No version bump.
- `career` is the career timeline, optional and added without a version bump: `{ seq, log, unlocked, fresh, returns }`. `log` is the journal, newest 2,000 entries, each a tuple `[seq, at, type, ref, money, xpTotal, data?]` (`data` is a flat object of numbers, strings and booleans). `unlocked` is every timeline row already unlocked, in order, so each reveal plays once; `fresh` is the ones still marked NEW; `returns` counts comebacks after a break. `save.ts` only checks the shape (it is on the boot path); the store drops unknown row ids and journal types at boot (`src/game/careerSync.ts`, `src/game/careerLog.ts`), so a save that unlocked the retired `editor` and `terminal` rows boots without them and gets `studio` from its progress.
- `profile` is the career's handle and product (`{ handle, product, chosen }`), optional and added without a version bump. A fresh save draws one with `chosen: false`, which shows the start card until the player keeps it. On load, only a handle the word lists can draw is accepted, so a hand-edited save cannot put its own words on screen; any other field is dropped, and a bad handle makes boot draw again. `product` is the handle's animal in capitals plus one of eight suffixes (`Otterly`, `Otterbase`); on load any other value is replaced by a fresh draw, so a profile saved before products gets one with no version bump and keeps its `chosen`. A save from before this field gets one with `chosen: true`.
- A save from before the timeline has no `career`. Boot gives it every row its progress already opens, plus the desk cat it already had, quietly (no reveals, no NEW markers), backfills a short journal of what it holds, and shows one "What's new" card. A save with no progress at all starts a new journal instead.
- Hydrating a save that was put away at least 10 minutes earlier (`RETURN_BREAK_MS`) appends a `return` entry (`awayMs`, `creditedMoney`, `creditedXp`) and bumps `returns`.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
