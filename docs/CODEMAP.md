# Code map

## Where to edit

| What | File |
| --- | --- |
| Phase A-C tables (skills, gigs, jobs, gates) | `src/data/phases.ts` |
| Gear table and its kinds (`src/data/gear.ts`; `phases.ts` re-exports the rows as `EQUIPMENT`, which the shop imports) | `src/data/gear.ts` |
| Phase D capital catalog (`artId` + `era`) | `src/data/capital.ts` |
| Which sprite each skill, gig, job and equipment item uses | `src/data/art.ts` |
| Sprite URLs (`spriteForTier`, `thumbForTier`) and era accents | `src/data/sprites.ts` |
| The desk band for each stage art id, named in the status bar | `src/data/idePacks.ts` |
| The desk band and the shop-era preview that snaps back | `src/game/ide.ts` |
| Random events: the table (a drop-in file) and the choice runner | `src/data/events.ts`, `src/game/events.ts` |
| The desk chrome (window bar, activity bar, career log sidebar, status bar) | `src/components/TitleBar.tsx`, `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Gif parade: the unlocked gifs moving round the stage's editor area. The paths and the category tables are drop-ins; each path is a case of `paradeAt`. Its pacing, counts and reduced-motion slowdown are constants in the files below | `src/data/paradeStyles.ts`, `src/game/gifParade.ts`, `src/game/paradePool.ts`, `src/components/GifParade.tsx`, `ParadeSourceList` and `ParadeStyleList` in `src/components/deskSettingsPanels.tsx` |
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
| The opening's gates (`openingGigXp` head start, `openingJobXp` staircase) | `src/data/costs.ts`, applied in `src/data/phases.ts` |
| Leadership: IC and Manager after Senior, the pick, the rows of each line, the old-save mapping | `src/data/leadership.ts` (data), `src/data/phases.ts` (`lead` on rows 16-24, `visibleJobs(spec, lead)`), `src/game/build.ts` (`leadPickOpen`, `normalizeBuild`), `LeadPick` in `src/components/Shop.tsx` |
| Shop scroll: a tab switch and a row appearing land on the bottom of the list (the newest row; the phone list re-pins after it resizes to three rows) | `src/components/shopScroll.ts` (`scrollShopBottom`, `pinShopBottom`), used in `src/components/Shop.tsx` |
| The next-unlock suggestion (whole game, and per shop tab through `shopFocus`), including the "pick a specialization" and "pick a leadership line" steps. Read by the harness; no screen shows it | `src/game/nextUnlock.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save and offline credit | `src/game/save.ts` |
| Prestige: the formula's constants and the perk table | `src/data/legacy.ts` (`PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER`, `PERK`, `LEGACY_PERKS`) |
| Prestige rules: Prestige on Exit, the Exit gate, perk order and price, the starting grant, save checks, headline text | `src/game/legacy.ts` (the `exit` and `buyLegacy` actions are in `src/game/store.ts`; the multiplier is a factor in `src/game/mods.ts`) |
| What each perk does, as numbers: `perkEffects` (cap, prices, salaries, capital income) | `src/game/perks.ts`, read by `src/game/economy.ts` (prices, `idleParts`) and `src/game/gold.ts` (`offlineCapMs`) |
| Exit button, confirmation and headline cards, the Prestige panel (admin mode) | `src/components/ExitPanel.tsx`, `src/components/useExit.ts`; the button is in the Prestige panel, opened by the crown on `src/components/IdeChrome.tsx`; the headline card is in `src/App.tsx` |
| Time-to-finish model and its formula (`npm run pace`) | `src/game/pace.ts` (`simulatePace`, and `simulateExits` over several careers), `scripts/pace.mjs`, [PACING.md](PACING.md) |
| Loop, purchases, money pops | `src/game/store.ts` |
| Shop panel, rows and banner | `src/components/Shop.tsx` |
| Hero squash, tick and count-up (Motion) | `src/components/HeroMoney.tsx` |
| Motion in the interface: the lazy loader, the presence ref (a spring in, a still copy fading out), the click-path helpers, the small badges | `src/components/useMotion.ts` (rules in `docs/ART.md`, Motion in the interface) |
| Every dialog's backdrop and its entrance and exit | `src/components/ModalBackdrop.tsx` |
| The shop's motion: owned count, price, row sweep, rows opening, the sliding tab bar, the list entrance, the phone sheet's release spring | `src/components/shopMotion.ts`, used by `src/components/Shop.tsx` and `src/components/ShopGrip.tsx`; the pure drag rules and release speed are in `src/game/shopDock.ts` |
| Career timeline: what unlocks, its trigger and reveal size (a drop-in table) | `src/data/features.ts` |
| Timeline gates, tease progress, Up next, the dim outline, earned cosmetics | `src/game/features.ts` |
| Career journal: entries, JSON lines, the career log's rows | `src/game/careerLog.ts` |
| Turning progress into journal notes, unlocks, NEW markers and reveals; boot and old saves | `src/game/careerSync.ts` (wired in `src/game/store.ts`) |
| Reveal player and card, NEW marks, dim outlines, feature hooks | `src/components/UnlockReveals.tsx`, `src/components/FeatureMarks.tsx`, `src/components/useFeature.ts` |
| Notification history: the bell in the activity bar, the unlocks it lists (newest first, from the journal) and its unread count (rows still marked NEW). "Open" on a row kept in settings (a click kit, a theme, a music style, the parade, rosters on narrow screens) opens the settings menu on that row (`settingsTargetsOf`, `data-settings-target`); the rest open their own surface | `src/game/notifications.ts`, `src/components/NotificationsButton.tsx`, `openSettingsAt` in `src/game/surfaces.ts`, `EditorSettings.tsx` |
| Rosters: the activity bar button (opens a list of every open roster and the cats), the status bar chip, and the settings menu section (all widths); the catalog and cat roster modals | `src/components/RostersButton.tsx`, `RosterButtons` and `RosterModals` in `src/components/IdeStatusDock.tsx`, `src/components/EditorSettings.tsx`, `src/components/CatalogRosterModal.tsx`, `src/components/CatRosterModal.tsx`, `src/game/rosters.ts`, `src/game/rosterModal.ts` |
| Desk cat roster (the cats a tap can turn the desk cat into): the generated pool, and the hand curation that drops non-cats and adds cats the catalog pick misses | `src/data/deskCatClickPool.json` (generated), `scripts/desk-cat-curation.json` (`exclude`, `add`), `scripts/generate-emoji-manifest.mjs`, `src/game/catRoster.ts` |
| Career log sidebar | `src/components/CareerLog.tsx`, `src/game/ideSidebar.ts` |
| "Open this" requests (a card's Try it) | `src/game/surfaces.ts` |
| Timeline styles | `src/styles/unlocks.css` |
| Small screens (860px and below): stacked stage and shop (a shop tab shows three rows and scrolls; on a portrait phone the grip drags the shop down to dock it to a bar, and a tap or a drag up opens it, the same `shopPanel` pref that hides it on desktop; dragging the grip up from three rows expands the sheet to any height up to the top of the screen, and a tap on the grip returns it to three rows), the window bar (`TitleBar`) at every width, the Owned modal button in the activity bar (the bar scrolls with its foot pinned) | `src/styles/mobile.css`, `src/components/ShopGrip.tsx`, `src/game/shopDock.ts`, `src/components/OwnedModal.tsx`, `src/game/mobileViewport.ts` |
| Mobile layout check: plays six viewports and fails on layout problems (`npm run check:mobile`) | `scripts/mobile-check.mjs`, `.agents/skills/mobile-check/SKILL.md` |
| The icon each timeline row wears (shop badges) | `src/components/featureIcons.ts` |
| The career's handle: word lists, draws, save checks; the start card with Reroll and Start | `src/game/identity.ts`, `src/components/IdentityPicker.tsx` |
| GitHug profile: contribution graph from the journal, pinned repos, the real repo's star | `src/game/githug.ts`, `src/components/GitHugModal.tsx`, `src/components/ActivityLinks.tsx`, `src/styles/githug.css` |

Editing a row in `src/data/capital.ts` is enough for the capital shop, as long as the row has the fields the others have. `artId` names an existing drawing in `DRAW` (`src/pixel/art.ts`); there is no new art to add for a new row.

## Catalog capacity

Skills, gigs, jobs, gear and capital are plain typed arrays with unique ids. Nothing assumes a row count, so a table drop replaces the array. Ids past the end of an art table reuse its drawings in order (`artFor`). A new gear `kind` is one line in `GEAR_KINDS`. Gig and job ids are checked against the live tables on load, so a removed row drops out of a save. Counts for ids this build does not sell are kept.

Skills, gigs, jobs and gear borrow drawings through `src/data/art.ts`. Each capital row names the drawing it wants with `artId`, and that drawing also picks the desk band.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). Late capital prices are well inside that range, but the dollars a career earns can pass 1e15 and are approximate there. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. The display cutoffs and suffixes are in `src/game/format.ts`.

## GitHub Pages

`npm run preview:pages` builds with `--base=/tech-ascension/` and serves `dist/` at <http://127.0.0.1:43124/tech-ascension/>, the same sub-path a project Pages site uses. Asset URLs must go through `import.meta.env.BASE_URL` (or Vite-processed HTML) so they work under that prefix.
