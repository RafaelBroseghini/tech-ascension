# Save

The career is one record in a small IndexedDB ledger (Dexie, `src/game/ledger.ts` and `src/game/ledgerDexie.ts`), written with a compare-and-swap on a revision number, so a stale write is refused. Desk, theme, shop-tab and similar preferences sit beside it as their own rows. The career body is the `SaveData` shape in `src/game/save.ts`, schema version 5:

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
- `activeBoost`, `foreverMult`, `tempMults`, `stats` and `seenMilestones` are optional.
- There is no migration. A payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes.
- On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`.
- Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours. Event multipliers apply to the offline credit for the part of the gap they covered.
- The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.
- Ids for rows this build does not sell are kept, so a table drop does not eat a save.
