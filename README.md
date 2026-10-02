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

### Preview as GitHub Pages would serve it

```bash
npm run preview:pages
```

Builds with `--base=/tech-ascension/` and serves `dist/` at [http://127.0.0.1:43124/tech-ascension/](http://127.0.0.1:43124/tech-ascension/), the same sub-path a project Pages site uses. Asset URLs must go through `import.meta.env.BASE_URL` (or Vite-processed HTML) so they work under that prefix.

## How it plays

- Click the stage sprite for money and 1 XP. It reacts on pointer-down: it tilts away from the click point, squashes and shakes (harder the faster you click), and throws a shockwave ring, sparks and a floating payout. Click power starts at $1 and grows when a generator has a click bonus.
- Generators add idle $/s. Cost of the next copy is `floor(baseCost × 1.15 ^ owned)`.
- The stage shows the highest tier you own. Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top tier plays a reveal burst.
- Upgrades are hidden until they are within reach. A row (and its era tab) appears the first time your balance has reached its base price, with a `New` tag. The highest balance you have ever held is saved as `peakMoney`, so a row never hides again. Tab order follows the eras present in `TIERS`. Affordable rows highlight.
- `$/s` and the click-boost readout stay out of the metrics bar until they apply (first generator, first boost).
- Click boosts (`×2` / `×5` / `×10`) multiply **click power only**. Idle $/s is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. A toast, a chip over the sprite and the metrics strip show the multiplier while it runs.
- Coming back credits idle income for up to 8 hours and toasts `welcome back, credited $X`.

## Where to edit

| What | File |
| --- | --- |
| Generator table | `src/data/tiers.ts` |
| Sprite subjects and `SPRITE_BY_TIER` | `src/data/sprites.ts` |
| Art | `public/sprites/{id}.webp` (512×512; `0.webp` is the opening scene) |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle | `src/game/economy.ts` |
| Save, migration, offline credit | `src/game/save.ts` |
| Loop and purchases | `src/game/store.ts` |

Replacing `TIERS` is enough for the shop, as long as each row has `id`, `era`, `name`, `baseCost`, `cps`, and `clickBonus`. Add a matching subject in `src/data/sprites.ts` and a file at `public/sprites/{id}.webp` when you want new art. Owned counts are stored by tier id, so new ids do not need a save migration.

## Save

`localStorage` key `tech-ascension.save`, schema version 1:

```json
{
  "version": 1,
  "money": 0,
  "xp": 0,
  "owned": { "1": 2 },
  "savedAt": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 },
  "peakMoney": 0
}
```

`peakMoney` is optional; older saves without it start from their current balance. `src/game/save.ts` migrates an unversioned blob (including a legacy owned array) up to version 1. On load, `activeBoost` is dropped when `endsAt <= Date.now()`. Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours.

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

Clicks register on pointer-down. The sprite tilts away from the click point, squashes, and wobbles side to side (~380ms, restarted instantly on every click), flashes brighter, and sends out a shockwave ring, sparks, and a drifting `$` / XP payout. Fast clicking builds "heat", which strengthens the shake and the glow around the sprite. Idle, the sprite floats, an aura breathes, motes rise, and a sheen sweeps the art. An active click boost adds a chip over the sprite, a faster pulse, bigger payouts, and the screen-edge shimmer. Buying flashes the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst and confetti. New shop rows slide in with a `New` tag and a pulsing glow. `prefers-reduced-motion` drops the float, particles, shake and shimmer and keeps a short click flash.

## Art

All 49 sprites are painterly fantasy illustrations (one per tier plus the opening scene), generated as 1024px images and stored as 512px WebP. To swap one, drop a square image in as `public/sprites/{id}.webp`, for example:

```bash
ffmpeg -i new.png -vf scale=512:512 -c:v libwebp -quality 82 public/sprites/12.webp
```

Update the matching caption in `src/data/sprites.ts` as well.
