# Code map

## Where to edit

| What | File |
| --- | --- |
| Phase A-C tables (skills, gigs, jobs, gates) | `src/data/phases.ts` |
| Gear table and its kind groups (re-exported as `EQUIPMENT`) | `src/data/gear.ts` |
| Phase D capital catalog (25 rows, `artId` + `era`) | `src/data/capital.ts` |
| Which sprite each skill, gig, job and equipment item uses | `src/data/art.ts` |
| Sprite URLs (`spriteForTier`, `thumbForTier`) and era accents | `src/data/sprites.ts` |
| Which pack the IDE pane shows for each stage (files, inbox, deck) | `src/data/idePacks.ts` |
| Syntax colours and the lexer | `src/data/overlays.ts` |
| IDE navigation and the shop-era preview that snaps back | `src/game/ide.ts` |
| Random events: the 110-row table (a drop-in file) and the choice runner | `src/data/events.ts`, `src/game/events.ts` |
| The IDE chrome (activity bar, tree, tabs, statusline) | `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Click waterfall (owned developer-icons, cap, count) | `src/data/clickIcons.ts`, `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Phase screenshots (A XP, B gig pop, C jobs, D capital) through `__GAME__` | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle, XP rates | `src/game/economy.ts` |
| Gates, phase, shop tab order, stage | `src/game/phase.ts` |
| Next banner target, per shop tab | `src/game/nextUnlock.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save and offline credit | `src/game/save.ts` |
| Time-to-finish model and its formula (`npm run pace`) | `src/game/pace.ts`, `scripts/pace.mjs`, [PACING.md](PACING.md) |
| Loop, purchases, money pops | `src/game/store.ts` |
| Shop panel, rows and banner | `src/components/Shop.tsx` |
| Centered score pop and hero squash | `src/components/ScorePop.tsx`, `src/components/HeroMoney.tsx` |

Replacing `CAPITAL` is enough for the capital shop, as long as each row has `id`, `era`, `artId`, `name`, `baseCost`, `cps`, and `clickBonus`. `artId` points at an existing drawing (art 0-66); there is no new art to add for a new row. Costs do not have to rise with id.

## Catalog capacity

Skills, gigs, jobs, gear and capital are plain typed arrays with unique ids. Nothing assumes 50, 31, 30 or 25 rows. A table drop replaces the array. Ids past the end of an art table reuse its drawings in order (`artFor`). A new gear `kind` is one line in `GEAR_KINDS`. Gig and job ids are checked against the live tables on load, so a removed row drops out of a save. Counts for ids this build does not sell are kept.

The 66 drawings stay in use: skills, gigs, jobs and gear borrow them through `src/data/art.ts`, and each capital row names the drawing it wants with `artId`. That drawing also picks the editor snippet.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). Foundry and Mars prices (~1e16–5e22) still run, but the last dollars are approximate. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. Display keeps raw digits below 10 million, then M / B / T / Qa / Qi / Sx / Sp / Oc / No / Dc, then scientific notation past 1e36.

## GitHub Pages

`npm run preview:pages` builds with `--base=/tech-ascension/` and serves `dist/` at <http://127.0.0.1:43124/tech-ascension/>, the same sub-path a project Pages site uses. Asset URLs must go through `import.meta.env.BASE_URL` (or Vite-processed HTML) so they work under that prefix.
