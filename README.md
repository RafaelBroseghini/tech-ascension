# Tech Ascension

An idle clicker about a programmer climbing from a high-school laptop to a Mars data center. Click the stage, buy generators, and ride short click-only boosts. There is no prestige reset.

## Run

```bash
npm i && npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run smoke:play
npm run build
```

## How it plays

- Click the 256×256 stage sprite for money and 1 XP. Click power starts at $1 and grows when a generator has a click bonus.
- Generators add idle $/s. Cost of the next copy is `floor(baseCost × 1.15 ^ owned)`.
- The stage shows the highest tier you own. Before the first purchase it shows tier 1 (the used laptop) and the stage name stays High school.
- Shop tabs follow the eras present in `TIERS` (early, mid, upper, q3, end). Affordable rows highlight.
- Click boosts (`×2` / `×5` / `×10`) multiply **click power only**. Idle $/s is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. A toast and the metrics strip show the multiplier.
- Coming back credits idle income for up to 8 hours and toasts `welcome back, credited $X`.

## Where to edit

| What | File |
| --- | --- |
| Generator table | `src/data/tiers.ts` |
| Sprite subjects and `SPRITE_BY_TIER` | `src/data/sprites.ts` |
| Placeholder art | `public/sprites/{id}.svg` |
| Regenerate placeholders | `node scripts/generate-sprites.mjs` |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle | `src/game/economy.ts` |
| Save, migration, offline credit | `src/game/save.ts` |
| Loop and purchases | `src/game/store.ts` |

Replacing `TIERS` is enough for the shop, as long as each row has `id`, `era`, `name`, `baseCost`, `cps`, and `clickBonus`. Add a matching subject in `src/data/sprites.ts` and a file at `public/sprites/{id}.svg` when you want new art. Owned counts are stored by tier id, so new ids do not need a save migration.

## Save

`localStorage` key `tech-ascension.save`, schema version 1:

```json
{
  "version": 1,
  "money": 0,
  "xp": 0,
  "owned": { "1": 2 },
  "savedAt": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 }
}
```

`src/game/save.ts` migrates an unversioned blob (including a legacy owned array) up to version 1. On load, `activeBoost` is dropped when `endsAt <= Date.now()`. Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours.

The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). Foundry and Mars prices (~1e16–5e22) still run, but the last dollars are approximate. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. Display uses K / M / B / T / Qa / Qi, then scientific notation from 1e21.

## Agent / smoke play

`window.__GAME__` is on the page in dev and in `vite preview`. The full method list, the three smoke scenarios, and the Playwright connect pattern are in [AGENTS.md](AGENTS.md).

```bash
npm run smoke:play
```

That Vitest run resets, plays the early buy ladder, checks a tier-15 click boost, and simulates 1h and 10h offline catch-up. It exits non-zero if any assert fails.

```bash
npm run play:agent
```

That starts the dev server if needed and leaves Chrome open on port 9222 so another process can `page.evaluate(() => window.__GAME__.click())`. Prefer the harness over DOM selectors. Automated play should stay in early/mid unless you mean to push further.

## Motion

Clicks squash the sprite (~180ms) and float `$` / XP particles (~280ms). The sprite bobs while idle. An active click boost pulses the sprite and shimmers the screen edge. Buying flashes the row and ticks the money and owned figures. The first copy of a tier that opens a new era, or that becomes your highest tier, fires one short confetti burst. `prefers-reduced-motion` drops the bob, confetti, and shimmer and keeps a short click flash.
