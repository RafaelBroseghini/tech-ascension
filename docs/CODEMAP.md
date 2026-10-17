# Code map

## Where to edit

| What | File |
| --- | --- |
| Phase A-C tables (skills, gigs, jobs, gates) | `src/data/phases.ts` |
| Gear table and its kind groups (re-exported as `EQUIPMENT`) | `src/data/gear.ts` |
| Phase D capital catalog (25 rows, `artId` + `era`) | `src/data/capital.ts` |
| Which sprite each skill, gig, job and equipment item uses | `src/data/art.ts` |
| Sprite URLs (`spriteForTier`, `thumbForTier`) and era accents | `src/data/sprites.ts` |
| The desk band for each stage art id, named in the status bar | `src/data/idePacks.ts` |
| The desk band and the shop-era preview that snaps back | `src/game/ide.ts` |
| Random events: the 110-row table (a drop-in file) and the choice runner | `src/data/events.ts`, `src/game/events.ts` |
| The desk chrome (activity bar, career log sidebar, status bar) | `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Click waterfall (owned developer-icons, cap, count) | `src/data/clickIcons.ts`, `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Phase screenshots (A XP, B gig pop, C jobs, D capital) through `__GAME__` and agent-browser | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| 10x dev skills, `gold` in the code (buy amounts, hover click rate, offline cap): table, then rules | `src/data/gold.ts`, `src/game/gold.ts` |
| Hover click interval | `src/game/autoClick.ts` |
| Cost, click power, idle, XP rates | `src/game/economy.ts` |
| Gates, phase, shop tab order, stage | `src/game/phase.ts` |
| Next banner target, per shop tab | `src/game/nextUnlock.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save and offline credit | `src/game/save.ts` |
| Time-to-finish model and its formula (`npm run pace`) | `src/game/pace.ts`, `scripts/pace.mjs`, [PACING.md](PACING.md) |
| Loop, purchases, money pops | `src/game/store.ts` |
| Shop panel, rows and banner | `src/components/Shop.tsx` |
| Centered score pop and hero squash | `src/components/ScorePop.tsx`, `src/components/HeroMoney.tsx` |
| Career timeline: what unlocks, its trigger and reveal size (a drop-in table) | `src/data/features.ts` |
| Timeline gates, tease progress, Up next, the dim outline, earned cosmetics | `src/game/features.ts` |
| Career journal: entries, JSON lines, the career log's rows | `src/game/careerLog.ts` |
| Turning progress into journal notes, unlocks, NEW markers and reveals; boot and old saves | `src/game/careerSync.ts` (wired in `src/game/store.ts`) |
| Reveal player and card, NEW marks, dim outlines, feature hooks | `src/components/UnlockReveals.tsx`, `src/components/FeatureMarks.tsx`, `src/components/useFeature.ts` |
| Career log sidebar | `src/components/CareerLog.tsx`, `src/game/ideSidebar.ts` |
| "Open this" requests (a card's Try it) | `src/game/surfaces.ts` |
| Your company: the activity-bar button, the shop's Company tab, and the burst that drives the globe | `src/components/globe/CompanyTab.tsx`, `src/components/globe/traffic.ts` |
| The globe: three.js scene, canvas (a lazy chunk), the small one on the desk (`MiniGlobe.tsx`, drawn `compact`) and the numbers pane in the details view | `src/components/globe/` (`GlobeScene.ts`, `GlobeCanvas.tsx`, `MiniGlobe.tsx`, `GlobePane.tsx`, `notes.ts`, `feed.ts` and `GlobeFeed.tsx` for the desk globe's one-line feed, `nextStep.ts` for the world pane's lead line) |
| Users, incidents and the win: regions, seeds, reach, resistance, the world's rules (the `INCIDENTS` table) and calibration | `src/game/globe/world.ts`, `src/game/globe/growth.ts` (`stepCompany`, `settleGrowth`) |
| Serving: demand, capacity, drops, lost dollars and health in one `servingOf` | `src/game/globe/load.ts` |
| The company's actions (buy a region, deploy or switch a PoP, respond to an incident) as pure patches the store commits | `src/game/globe/actions.ts` |
| What the globe draws of the company, and the burst of requests its users send | `src/game/globe/company.ts`, `src/game/globe/wave.ts` |
| The world pane: users against the target, regions, resistance and the incidents to Respond to | `src/components/globe/WorldPanel.tsx` |
| Globe tooltip: the city rows, the trip time and the tally of a burst | `src/game/globe/tip.ts` |
| Timeline styles | `src/styles/unlocks.css` |
| The icon each timeline row wears (shop badges) | `src/components/featureIcons.ts` |
| The career's handle: word lists, draws, save checks; the start card with Reroll and Start | `src/game/identity.ts`, `src/components/IdentityPicker.tsx` |
| GitHug profile: contribution graph from the journal, pinned repos, the real repo's star | `src/game/githug.ts`, `src/components/GitHugModal.tsx`, `src/components/CornerActions.tsx`, `src/styles/githug.css` |

Replacing `CAPITAL` is enough for the capital shop, as long as each row has `id`, `era`, `artId`, `name`, `baseCost`, `cps`, and `clickBonus`. `artId` points at an existing drawing (art 0-66); there is no new art to add for a new row. Costs do not have to rise with id.

## Catalog capacity

Skills, gigs, jobs, gear and capital are plain typed arrays with unique ids. Nothing assumes 50, 31, 30 or 25 rows. A table drop replaces the array. Ids past the end of an art table reuse its drawings in order (`artFor`). A new gear `kind` is one line in `GEAR_KINDS`. Gig and job ids are checked against the live tables on load, so a removed row drops out of a save. Counts for ids this build does not sell are kept.

The 66 drawings stay in use: skills, gigs, jobs and gear borrow them through `src/data/art.ts`, and each capital row names the drawing it wants with `artId`. That drawing also picks the desk band.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). Foundry and Mars prices (~1e16–5e22) still run, but the last dollars are approximate. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. Display keeps raw digits below 10 million, then M / B / T / Qa / Qi / Sx / Sp / Oc / No / Dc, then scientific notation past 1e36.

## GitHub Pages

`npm run preview:pages` builds with `--base=/tech-ascension/` and serves `dist/` at <http://127.0.0.1:43124/tech-ascension/>, the same sub-path a project Pages site uses. Asset URLs must go through `import.meta.env.BASE_URL` (or Vite-processed HTML) so they work under that prefix.
