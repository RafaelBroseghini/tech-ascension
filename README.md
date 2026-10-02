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

- Click the stage sprite for money and 1 XP. It reacts on pointer-down: it bumps up, tips slightly away from the click point and settles with a tiny jitter (about 260ms, a little bigger the faster you click), with a flat ring, square sparks, a floating payout, and a pixel thumb of a random owned tier that drops from the cursor (a boost adds one or two more). Click power starts at $1 and grows when a generator has a click bonus.
- Generators add idle $/s. Cost of the next copy is `floor(baseCost × 1.15 ^ owned)`.
- The stage shows the highest tier you own, in pixel art, in front of a backdrop shared by its era (see Art). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top tier plays a reveal burst.
- Upgrades are hidden until they are within reach. A row (and its era tab) appears the first time your balance has reached its base price, with a `New` tag. The highest balance you have ever held is saved as `peakMoney`, so a row never hides again. Tab order follows the eras present in `TIERS`. Affordable rows highlight.
- `$/s` and the click-boost readout stay out of the metrics bar until they apply (first generator, first boost).
- Click boosts (`×2` / `×5` / `×10`) multiply **click power only**. Idle $/s is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs.
- Coming back credits idle income for up to 8 hours and toasts `welcome back, credited $X`.

## Where to edit

| What | File |
| --- | --- |
| Generator table | `src/data/tiers.ts` |
| Sprite URLs (`spriteForTier`, `thumbForTier`) and era accents | `src/data/sprites.ts` |
| Which backdrop each stage uses | `src/data/backdrops.ts` |
| Pixel art: palette, drawing helpers, one drawing per tier, backdrops | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`, `backgrounds.ts`) |
| Click waterfall rules (cap, count, owned ids) | `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Before/after screenshots through `__GAME__` | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle | `src/game/economy.ts` |
| Save, migration, offline credit | `src/game/save.ts` |
| Loop and purchases | `src/game/store.ts` |

Replacing `TIERS` is enough for the shop, as long as each row has `id`, `era`, `name`, `baseCost`, `cps`, and `clickBonus`. Add a drawing for the new id in `src/pixel/art.ts` (it falls back to tier 1 art until you do) and extend the ranges in `src/data/backdrops.ts` if it starts a new scene. Owned counts are stored by tier id, so new ids do not need a save migration.

## Save

`localStorage` key `tech-ascension.save`, schema version 2:

```json
{
  "version": 2,
  "money": 0,
  "xp": 0,
  "owned": { "1": 2 },
  "savedAt": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 },
  "peakMoney": 0
}
```

`peakMoney` is optional; older saves without it start from their current balance. `src/game/save.ts` migrates an unversioned blob (including a legacy owned array) up to the current version. Version 2 added 18 dev-culture stages (Raspberry Pie, Mac Minnie, OpenKlaw and others), which shifted most tier ids, so loading a version 1 save re-keys `owned` through `V1_TO_V2_TIER_IDS`. That table is frozen history: never edit it. When you add a stage, bump `SAVE_VERSION`, add a migration that remaps ids, and keep the sprite files named by the new ids. On load, `activeBoost` is dropped when `endsAt <= Date.now()`. Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours.

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

Clicks register on pointer-down. The sprite bumps up, tips slightly away from the click point and settles with a tiny jitter (~260ms, restarted instantly on every click), flashes brighter, and sends out a flat ring, square sparks, a drifting `$` / XP payout, and the click waterfall: the 32×32 pixel thumb of a random owned tier spawns at the cursor and falls for 300ms under gravity (x drifts, y follows t²) while fading out. One thumb per click, one or two more during a boost, never more than 14 alive at once (the oldest is dropped). Fast clicking builds "heat", which makes the bump a little bigger and strengthens the glow around the sprite. Idle, the sprite floats, an aura breathes and motes rise; a few backdrops blink their cursor or rack LEDs. An active click boost adds a chip over the sprite, a rotating rim light, bigger payouts, and a lit metrics cell. Buying sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows slide in with a `New` tag. Moving to a new era cross-fades the accent and wipes it across the stage, and a new backdrop fades in over the old one. `prefers-reduced-motion` kills CSS animation globally, hides the particles and the waterfall and skips the bump, keeping a short click flash.

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`: ink `#1a1c2c` outlines, era accents early `#41a6f6`, mid `#38b764`, upper `#b13e53`, q3 `#ffcd75`, end `#ef7d57`, boost glow `#73eff7`). No image files ship.

- **Sprites.** `src/pixel/art.ts` has one 64×64 drawing per tier plus art 0 (the opening attic), built from shared props in `motifs.ts`, lit from the top-left. The 32×32 thumb is the same drawing reduced 2:1. Both get a 1px ink outline, no anti-aliasing and at most 16 colours, and are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges` then `pixelated`, and the stage sprite is always a whole multiple (3×) of its 64px grid.
- **Backdrops.** Ten 160×160 era-shared scenes in `src/pixel/backgrounds.ts`: `bg-editor` (tier 1 to 8, and before the first purchase), `bg-desk` (9 to 18), `bg-office` (19 to 25), `bg-lab` (26 to 36, hotter at first LLM), `bg-saas` (37 to 41, including Found your AI company), `bg-board` (42 to 44), `bg-fab` (q3), `bg-dc` (54 to 58), `bg-orbit` (59 to 62) and `bg-mars` (63 to 66, including Mars pilot and up). The ranges live in `src/data/backdrops.ts`. A flat scrim keeps the money and owned strip readable.
- **Captions.** There is no flavor line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`; `npm test` checks the size, colour count and outline of every sprite.
