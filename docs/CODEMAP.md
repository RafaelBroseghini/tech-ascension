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
| The desk chrome (window bar, activity bar, career log sidebar, status bar) | `src/components/TitleBar.tsx`, `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Gif parade: every unlocked gif (found cats, and the idle and click art of rows held) moving round the stage's editor area together (cap 30-50 by stage size, one swap every 1-2 s; it opens in the mid game, with the first capital row of the mid era, as the `parade` row of the career timeline, and all fourteen paths and every category come with it; under the OS reduce-motion setting the paths run at 35% of their pace rather than freezing; the `parade` switch and the `paradeSource` and `paradeStyle` picks in the desk prefs). The style and category tables are drop-ins; each style's path is one case of `paradeAt` | `src/data/paradeStyles.ts`, `src/game/gifParade.ts`, `src/game/paradePool.ts`, `src/components/GifParade.tsx`, `ParadeSourceList` and `ParadeStyleList` in `src/components/deskSettingsPanels.tsx` |
| The unlock celebration (the sprite's crouch, spring and shake, the flash and rings in Motion; the shards in canvas-confetti) | `src/components/UnlockFx.tsx` (choreography and theme colours), `forceCelebration` in `src/game/harness.ts`, `.unlock-*` in `src/index.css` |
| Click fountain (owned developer-icons, toss, cap, count) | `src/data/clickIcons.ts`, `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| UI font pick (five self-hosted faces, a per-face size scale, lazy CSS, a pref beside the theme) | `src/data/uiFonts.ts`, `src/game/uiFont.ts`, `UiFontList` in `src/components/deskSettingsPanels.tsx` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Phase screenshots (A XP, B gig pop, C jobs, D capital) through `__GAME__` and agent-browser | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| 10x dev skills, `gold` in the code (buy amounts, hover click rate, offline cap): table, then rules | `src/data/gold.ts`, `src/game/gold.ts` |
| Hover click interval | `src/game/autoClick.ts` |
| Specializations: the six, their job tracks and ids, the pick, the one switch, `heldRank`, the click and idle style factors, the save block's checks | `src/data/specializations.ts` (data), `src/data/phases.ts` (`visibleJobs`, track rows), `src/game/build.ts` (rules; the actions are in `src/game/store.ts`), the pick and switch rows in `src/components/Shop.tsx` (`SpecPick`, `SpecSwitch`) |
| Cost, click power, idle, XP rates | `src/game/economy.ts` |
| Gates, phase, shop tab order, stage | `src/game/phase.ts` |
| The progression tree: what every row needs and what it opens, one node per row (`requires`, `after`, tracks, strict or loose), and the evaluator | `docs/TREE.md` (the model), `src/data/tree.ts` (the structure, written by hand: the gig path and the job paths), `src/game/tree/graph.ts` (builds the nodes), `check.ts` (evaluator), `index.ts` (walks), `oracle.ts` (the old rules, a test oracle), `scripts/tree.mjs` (`npm run tree`) |
| Origins (College, Bootcamp, Dropout): the pick a minute in (`ORIGIN_ASK_XP`) and what each prices or opens early | `src/data/origins.ts` (data), `src/game/origin.ts` (rules), `originOf`, `canPickOrigin`, `originDue` in `src/game/build.ts`, the gates in `src/game/phase.ts`, `src/components/OriginPick.tsx` (the card), `src/components/IdentityPicker.tsx` (the start card) |
| The opening's compressed gates (`openingXp`) | `src/data/costs.ts`, applied in `src/data/phases.ts` |
| Career years and marks: the year from lifetime XP, the calendar of moments per path, the journal lines and toast | `src/data/careerYears.ts` (the marks), `src/game/careerYear.ts` (the year), the `year` journal type in `src/game/careerLog.ts`, the subscription in `src/game/store.ts`, `CareerYears` in `src/components/CareerLog.tsx`, the chip in `src/components/IdeChrome.tsx` |
| Frontend's launches (manual clicks charge a launch that adds users) and an AI build's GPU growth | `src/game/launch.ts`, `gpuGrowth` and `gpuGrowthOf` in `src/data/specializations.ts`, `gpusHeld` in `src/game/build.ts`, the click in `src/game/store.ts` |
| Leadership: IC and Manager after Senior, the pick, the rows of each line, the manager ranks that open hiring, the ending a line forces, the old-save mapping | `src/data/leadership.ts` (data), `src/data/phases.ts` (`lead` on rows 16-24, `visibleJobs(spec, lead)`), `src/game/build.ts` (`leadPickOpen`, `hireLocked`, `normalizeBuild`), `src/game/globe/hires.ts` (`rank` on each kind), `src/game/globe/product.ts` (the forced ending), `LeadPick` in `src/components/Shop.tsx`, the locked hire rows in `src/components/Team.tsx` |
| Next banner target, per shop tab (including the "pick a specialization" and "pick a leadership line" steps) | `src/game/nextUnlock.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save and offline credit | `src/game/save.ts` |
| Prestige: the formula's constants, the perk table, the Hall of Fame list | `src/data/legacy.ts` (`PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER`, `ENDING_BONUS`, `PERK`, `LEGACY_PERKS`, `HALL_OF_FAME`) |
| Prestige rules: Prestige on Exit, the ending bonus, the Exit gate, perk order and price, the starting grant, save checks, headline text | `src/game/legacy.ts` (the `exit` and `buyLegacy` actions are in `src/game/store.ts`; the multiplier is a factor in `src/game/mods.ts`) |
| What each perk does, as numbers: `perkEffects` (cap, prices, salaries, growth, revenue, start users) | `src/game/perks.ts`, read by `src/game/economy.ts` (prices, `idleParts`), `src/game/gold.ts` (`offlineCapMs`), `src/game/globe/product.ts` (growth and revenue facts) |
| Sell button, confirmation and headline cards, the Prestige panel (admin mode) | `src/components/ExitPanel.tsx`, `src/components/useExit.ts`; the button is on `src/components/globe/CompanyTab.tsx`, the crown on `src/components/IdeChrome.tsx`, the headline card in `src/App.tsx`, the product beat in `src/components/IdentityPicker.tsx` |
| Time-to-finish model and its formula (`npm run pace`) | `src/game/pace.ts` (`simulatePace`, and `simulateExits` over several careers, with the product), `scripts/pace.mjs`, [PACING.md](PACING.md) |
| Loop, purchases, money pops | `src/game/store.ts` |
| Shop panel, rows and banner | `src/components/Shop.tsx` |
| Hero squash, tick and count-up (Motion) | `src/components/HeroMoney.tsx` |
| Motion in the interface: the lazy loader, the presence ref (a spring in, a still copy fading out), the click-path helpers, the small badges | `src/components/useMotion.ts` (rules in `docs/GAMEPLAY.md`, Motion in the interface) |
| Every dialog's backdrop and its entrance and exit | `src/components/ModalBackdrop.tsx` |
| The shop's motion: owned count, price, row sweep, rows opening, the sliding tab bar, the list entrance, the phone sheet's release spring | `src/components/shopMotion.ts`, used by `src/components/Shop.tsx` and `src/components/ShopGrip.tsx`; the pure drag rules and release speed are in `src/game/shopDock.ts` |
| Career timeline: what unlocks, its trigger and reveal size (a drop-in table) | `src/data/features.ts` |
| Timeline gates, tease progress, Up next, the dim outline, earned cosmetics | `src/game/features.ts` |
| Career journal: entries, JSON lines, the career log's rows | `src/game/careerLog.ts` |
| Turning progress into journal notes, unlocks, NEW markers and reveals; boot and old saves | `src/game/careerSync.ts` (wired in `src/game/store.ts`) |
| Reveal player and card, NEW marks, dim outlines, feature hooks | `src/components/UnlockReveals.tsx`, `src/components/FeatureMarks.tsx`, `src/components/useFeature.ts` |
| Notification history: the bell in the activity bar, the unlocks it lists (newest first, from the journal) and its unread count (rows still marked NEW) | `src/game/notifications.ts`, `src/components/NotificationsButton.tsx` |
| Career log sidebar | `src/components/CareerLog.tsx`, `src/game/ideSidebar.ts` |
| "Open this" requests (a card's Try it) | `src/game/surfaces.ts` |
| Your company: the activity-bar button and the shop's Company tab | `src/components/globe/CompanyTab.tsx` |
| The globe: three.js scene, canvas (a lazy chunk), the small one on the desk (`MiniGlobe.tsx`, drawn `compact`) and the numbers pane in the details view | `src/components/globe/` (`GlobeScene.ts`, `GlobeCanvas.tsx`, `MiniGlobe.tsx`, `GlobePane.tsx`, `notes.ts`, `feed.ts` and `GlobeFeed.tsx` for the desk globe's one-line feed, `nextStep.ts` for the world pane's lead line) |
| Users, incidents and the win: regions, seeds, reach, resistance, the world's rules (the `INCIDENTS` table) and calibration | `src/game/globe/world.ts`, `src/game/globe/growth.ts` (`stepCompany`, `settleGrowth`) |
| Serving: demand, capacity, drops, lost dollars and health in one `servingOf` | `src/game/globe/load.ts` |
| The company's actions (buy a region, deploy or switch a PoP, respond to an incident) as pure patches the store commits | `src/game/globe/actions.ts` |
| What the globe draws of the company, and the burst of requests its users send | `src/game/globe/company.ts`, `src/game/globe/wave.ts` |
| The world pane: users against the target, regions, resistance and the incidents to Respond to | `src/components/globe/WorldPanel.tsx` |
| Globe tooltip: the city rows, the trip time and the tally of a burst | `src/game/globe/tip.ts` |
| Timeline styles | `src/styles/unlocks.css` |
| Small screens (860px and below): stacked stage and shop (a shop tab shows three rows and scrolls; on a portrait phone the grip drags the shop down to dock it to a bar, and a tap or a drag up opens it, the same `shopPanel` pref that hides it on desktop; dragging the grip up from three rows expands the sheet to any height up to the top of the screen, and a tap on the grip returns it to three rows), the window bar (`TitleBar`) at every width, the Owned modal button in the activity bar (the bar scrolls with its foot pinned) | `src/styles/mobile.css`, `src/components/ShopGrip.tsx`, `src/game/shopDock.ts`, `src/components/OwnedModal.tsx`, `src/game/mobileViewport.ts` |
| Mobile layout check: plays six viewports and fails on layout problems (`npm run check:mobile`) | `scripts/mobile-check.mjs`, `.agents/skills/mobile-check/SKILL.md` |
| The icon each timeline row wears (shop badges) | `src/components/featureIcons.ts` |
| The career's handle: word lists, draws, save checks; the start card with Reroll and Start | `src/game/identity.ts`, `src/components/IdentityPicker.tsx` |
| GitHug profile: contribution graph from the journal, pinned repos, the real repo's star | `src/game/githug.ts`, `src/components/GitHugModal.tsx`, `src/components/ActivityLinks.tsx`, `src/styles/githug.css` |

Editing the rows in `src/data/capital.ts` is enough for the capital shop, as long as each row has `id`, `era`, `artId`, `name`, `baseCost`, `cps`, and `clickBonus`. `artId` points at an existing drawing (art 0-66); there is no new art to add for a new row. Costs do not have to rise with id.

## Catalog capacity

Skills, gigs, jobs, gear and capital are plain typed arrays with unique ids. Nothing assumes 50, 31, 30 or 25 rows. A table drop replaces the array. Ids past the end of an art table reuse its drawings in order (`artFor`). A new gear `kind` is one line in `GEAR_KINDS`. Gig and job ids are checked against the live tables on load, so a removed row drops out of a save. Counts for ids this build does not sell are kept.

The 66 drawings stay in use: skills, gigs, jobs and gear borrow them through `src/data/art.ts`, and each capital row names the drawing it wants with `artId`. That drawing also picks the desk band.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). The late capital prices (the last row, Mars megacampus Holdings, is about 6e12 after the purchase scale) are well inside that range, but the dollars a career earns can pass 1e15 and are approximate there. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. Display keeps raw digits below 10 million, then M / B / T / Qa / Qi / Sx / Sp / Oc / No / Dc, then scientific notation past 1e36.

## GitHub Pages

`npm run preview:pages` builds with `--base=/tech-ascension/` and serves `dist/` at <http://127.0.0.1:43124/tech-ascension/>, the same sub-path a project Pages site uses. Asset URLs must go through `import.meta.env.BASE_URL` (or Vite-processed HTML) so they work under that prefix.
