# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, shop-tab and similar preferences sit beside it as their own rows. Wiping the game keeps them, except the cat picked for the desk, which goes back to the default (the roster is found per run). The career body is the `SaveData` shape in `src/game/save.ts`, schema version 5:

```json
{
  "version": 5,
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
- `hackathon` is optional and omitted until the first run: `{ league, runs, wins, best, topLeague, nextAt, run }`. `run` is the weekend in progress or waiting to be closed, saved card by card: the frozen deck (`cards`, skill id → level), `draw`, `hand` and `pile`, swag held and on offer, round, score, ships, refactors, the judge and the mulberry32 `rng` state, so a reload deals the same cards. `parseSave` checks its numbers and keeps `run` as an object; the run is checked card by card against the hackathon tables when the app boots (`normalizeHackMeta`), so the save layer, which loads before the app, never pulls those tables in. A run whose cards do not add up to its deck, or that names unknown skills, swag or judges, is dropped, and the rest of the career loads. The scoring replay of the last ship is not saved. Adding it did not bump `SAVE_VERSION`.
- There is no migration. A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes.
- On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours (12, 16 or 24 with the Time away gold skills). Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
