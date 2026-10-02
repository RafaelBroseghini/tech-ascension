# Tech Ascension

An idle clicker about a programmer climbing from a high-school laptop to a Mars data center, in four phases: study for XP, take gigs for the first dollars, climb the job ladder, then deploy capital. Short click-only boosts ride on top. There is no prestige reset.

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

The economy is phase-gated. Numbers live in `src/data/phases.ts` (skills, gigs, jobs, gates), `src/data/gear.ts` and `src/data/capital.ts`. Every repeatable item costs `floor(base × 1.15 ^ owned)`.

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | $ and XP per click, no $/s | 105 skills (XP/click, XP/s). Early ones take a lot of clicks | start |
| **B Gigs** | first $ | 65 gigs: lump $ on clear, some add a retainer $/s | 14,000 lifetime XP and Portfolio (#15) + React (#16) owned |
| **C Jobs** | salary $/s | 31 jobs (held once) | 40,000 lifetime XP and 6 gigs cleared |
| **Gear** (shop tab, not a phase) | click bonus, $/s | 110 repeatable infra items (desk, Pi lab, GPUs, racks, cloud, Mars) | 10,000 lifetime XP. A row then shows once you have held its `unlockMoney` and, on later rows, its job |
| **D Capital** | heavy $/s | 25 rows, angel syndicate to Mars Holdings | the Senior job (id >= 14) OR $500,000 held at some point |

- **Clicks.** Every click pays both money (`$1 + equipment + capital bonuses`) and XP (`1 + skills`). Both numbers fall from the cursor. There is no $/s until a retainer gig. Boosts multiply both click payouts and leave idle income alone.
- **XP.** Skills cost XP, so spending lowers the balance, but gates and job requirements read lifetime XP (`xpTotal`) and never go down. Skills keep studying (XP/s) in every phase, including offline.
- **Gigs** clear once. Each one needs every earlier gig and a skill combination that grows by one skill (gig 1 needs the first six), capped at the skill table. Gig 8 (site maintenance retainer) is the first idle money.
- **Shop.** Five tabs: Skills, Gigs, Jobs (roles only), Gear (repeatable infra, grouped by kind), Capital (with era sub-tabs). Gear opens at 10,000 lifetime XP, ahead of the Gig Board, because its first rows cost a few hundred dollars. A locked tab shows what it needs, with the requirements ticking off. A newly opened phase takes over the tab (Gear never does, it is not a phase). Each list shows what you own plus the next thing you do not, even while that next row is still locked. New rows carry a `New` tag.
- **Next unlock banner.** A slim bar under the tabs always names the next thing to chase and what is missing (`Job Board - need 15,000 more XP · 2 more gigs`). Closed gates come first, cheapest XP threshold first: Gear, then the Gig Board, the Job Board, then Capital (either the Senior job or $500,000). With every gate open it walks Skills, Gigs, Jobs, Gear, then Capital and stops at the first row that has not been bought yet, so an earlier unlocked row is never skipped for a later one. The first copy is enough for repeatable gear, skills and capital. Clicking it opens that tab. The logic is `nextUnlock` in `src/game/nextUnlock.ts` and the target is exposed as `__GAME__.getState().nextUnlock`.
- **Stage.** The stage shows the highest capital tier you own, else the furthest job, gig or skill, in pixel art, in front of a fixed Catppuccin Mocha IDE whose editor buffer changes with progress (see Art). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.
- **Rare enemies** spawn once money exists (never in phase A), roll among the current era's enemies (`early` until a capital tier is owned), and pay dollars on a win.
- Click boosts (`×3` / `×5` / `×10`) multiply **click payout only**. Idle income is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. Waits are longer than the old 45s–360s table (early mean 75s, end mean 480s). A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs. At ×10 (any multiplier of 8 or more) that chrome turns gold.
- Coming back credits idle $ and idle XP for up to 8 hours and toasts `welcome back, credited $X`.

### Money pops (Balatro feel)

- **Raw digits first.** `formatNumber` keeps whole numbers as raw digits with separators (`1,234,567`) up to 9,999,999, then abbreviates (`10M`, `1.5B`, ... `Qa`). The hero balance has more room and keeps its digits up to $999,999,999,999 (`HERO_RAW_DIGITS_BELOW`), shrinking the font a notch once it is long. `formatNumber(v, 1000)` / `formatCompact` give the old tight K/M form.
- **Medium on a click** once money exists: the hero total squashes and rebounds (about 190ms).
- **Large** on a gig clear, a fight win and a phase unlock: a centered slam-in pop (`+$1,200`, `Gig cleared`) with a chromatic red/cyan split that converges, a bigger squash on the hero total, a count-up of the running total that overshoots then settles, plus the confetti burst and ring.
- **Never per idle tick.** Idle income just moves the number. `prefers-reduced-motion` turns the pops into a plain fade.
- The pop kinds are `MONEY_POP` in `src/data/phases.ts`; the last one is exposed as `__GAME__.getState().lastPop`.

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
| Random events: the 110-row table (a drop-in file) and the generic runner | `src/data/events.ts`, `src/game/events.ts` |
| The IDE chrome (activity bar, tree, tabs, statusline) | `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Click waterfall (owned developer-icons, cap, count) | `src/data/clickIcons.ts`, `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Phase screenshots (A XP, B gig pop, C jobs, D capital, fight pop) through `__GAME__` | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle, XP rates | `src/game/economy.ts` |
| Gates, phase, shop tab order, stage | `src/game/phase.ts` |
| Next-unlock banner target | `src/game/nextUnlock.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save and offline credit | `src/game/save.ts` |
| Loop, purchases, money pops | `src/game/store.ts` |
| Centered score pop and hero squash | `src/components/ScorePop.tsx`, `src/components/HeroMoney.tsx` |

Replacing `CAPITAL` is enough for the capital shop, as long as each row has `id`, `era`, `artId`, `name`, `baseCost`, `cps`, and `clickBonus`. `artId` points at an existing drawing (art 0-66); there is no new art to add for a new row. Costs do not have to rise with id.

**Catalog capacity.** Skills, gigs, jobs, gear and capital are plain typed arrays with unique ids. Nothing assumes 50, 31, 30 or 25 rows. A table drop replaces the array. Ids past the end of an art table reuse its drawings in order (`artFor`). A new gear `kind` is one line in `GEAR_KINDS`. Gig and job ids are checked against the live tables on load, so a removed row drops out of a save. Counts for ids this build does not sell are kept.

The 66 drawings stay in use: skills, gigs, jobs and gear borrow them through `src/data/art.ts`, and each capital row names the drawing it wants with `artId`. That drawing also picks the editor snippet.

## Save

`localStorage` key `tech-ascension.save`, schema version 4:

```json
{
  "version": 4,
  "money": 0,
  "xp": 0,
  "xpTotal": 0,
  "skills": { "1": 2 },
  "equipment": { "1": 1 },
  "owned": { "1": 1 },
  "jobs": [1, 2],
  "gigs": [1, 2, 3],
  "savedAt": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 },
  "peakMoney": 0
}
```

`equipment` is the Gear tab. `peakMoney` is required; `foreverMult` and `tempMults` are optional. There is no migration: a payload whose `version` is not `SAVE_VERSION`, or that is not a save object, is thrown away and a new career starts (`save was unreadable — new career started`). Bump `SAVE_VERSION` when the shape changes. On load, `activeBoost` and ended `tempMults` are dropped when `endsAt <= Date.now()`. Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours. Event multipliers apply to the offline credit for the part of the gap they covered.

The next-boost timer is session state. Reloading keeps a boost that is still running and schedules a fresh wait afterward.

## Numbers

Money and costs are JavaScript numbers (IEEE-754 doubles). `Math.floor` is exact only through `Number.MAX_SAFE_INTEGER` (~9.01e15). Foundry and Mars prices (~1e16–5e22) still run, but the last dollars are approximate. Switch `src/game/economy.ts` to `decimal.js` or `break_infinity.js` when exact integers past ~1e15 matter. Display keeps raw digits below 10 million, then M / B / T / Qa / Qi / Sx / Sp / Oc / No / Dc, then scientific notation past 1e36.

## Agent / smoke play

`window.__GAME__` is on the page in dev and in `vite preview`. The full method list, the three smoke scenarios, and the Playwright connect pattern are in [AGENTS.md](AGENTS.md).

```bash
npm run smoke:play
```

That Vitest run resets and plays phase A (XP-only clicks), the A-to-B gate, a gig clear and retainer, the job board and a senior job, the capital gate, a tier-26 click boost, 1h and 10h offline catch-up, and the fight cases. It exits non-zero if any assert fails.

```bash
npm run play:agent
```

That starts the dev server if needed and leaves Chrome open on port 9222 so another process can `page.evaluate(() => window.__GAME__.click())`. Prefer the harness over DOM selectors. Automated play should stay in phases A to C (and a single mid check) unless you mean to push further.

## Motion

Clicks register on pointer-down. The sprite bumps up, tips slightly away from the click point and settles with a tiny jitter (~260ms, restarted instantly on every click), flashes brighter, and sends out a flat ring, square sparks, a `$` / XP payout that pops up and then drops so rapid clicks stack, and the click waterfall: one developer-icon from the owned pool (skills, gigs, jobs, gear that have a real logo) spawns at the cursor at about half opacity and falls for 300ms under gravity (x drifts, y follows t²) while fading out. Soft skills with no logo stay out of the pool, so the early game is thin. One icon per click, one or two more during a boost, never more than 14 alive at once (the oldest is dropped). Fast clicking builds "heat", which makes the bump a little bigger and strengthens the glow around the sprite. Idle, the sprite floats, an aura breathes and motes rise. An active click boost adds a chip over the sprite, a rotating rim light, bigger payouts, and a lit metrics cell. Buying sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows slide in with a `New` tag. Moving to a new era cross-fades the accent and wipes it across the stage, and the editor buffer cross-fades to the next snippet (260ms) while the IDE chrome stays put. `prefers-reduced-motion` kills CSS animation globally, hides the particles and the waterfall and skips the bump, keeping a short click flash.

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`: ink `#1a1c2c` outlines, era accents early `#41a6f6`, mid `#38b764`, upper `#b13e53`, q3 `#ffcd75`, end `#ef7d57`, boost glow `#73eff7`). No image files ship; the IDE is CSS.

- **Sprites.** `src/pixel/art.ts` has one 64×64 drawing per tier plus art 0 (the opening attic), built from shared props in `motifs.ts`, lit from the top-left. The 32×32 thumb is the same drawing reduced 2:1. Both get a 1px ink outline, no anti-aliasing and at most 16 colours, and are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges` then `pixelated`, and the stage sprite is always a whole multiple (3×) of its 64px grid.
- **IDE chrome and packs (content v2).** One fixed Catppuccin Mocha shell (`#1e1e2e` base) sits behind the stage and never reads the era accent. What the editor pane shows depends on the era, in 14 packs from `src/data/idePacks.ts`, chosen by the highest owned art id in bands that never cross an era. Early is a single buffer per band: `fizzbuzz.py` (nothing bought to tier 6), `two_sum.py` (7 to 12), `reverse_list.go` (13 to 18). Mid and upper are multi-file packs with a clickable tab bar and an explorer file list: `debounce` (19 to 22, with its test and README), `search` (23 to 26, Java and its test), `workers` (27 to 30, Go with `go.mod`), `finetune` (31 to 33, train, data, config), `ratelimit` (34 to 36), `lru` (37 to 40, Rust with `Cargo.toml`), `attention` (41 to 44). Scale (q3) is an email inbox: the explorer lists sender and subject, a click opens the body (`fab` 45 to 49, `frontier` 50 to 53). Endgame is a slide deck with prev/next in the status bar and slide tabs (`edge` 54 to 58, `mars` 59 to 66). The tab bar, explorer list and status bar take clicks; the editor stays a dimmed backdrop under the sprite. The Capital tab's era sub-tab previews that era's first pack (status bar shows PREVIEW); owned progress is the rest state, and the preview snaps back when you leave the Capital tab, buy into a new era, or leave the shop and IDE alone for 20 seconds. Through `__GAME__`: `ide` in `getState()`, `ideSelect(i)`, `previewEra(era | null)`.
- **Random events.** `src/data/events.ts` is a drop-in table (id, name, eras, weight, effects, flavor, optional `requires`); `src/game/events.ts` is the one generic runner. Roughly every 240 seconds (clamped exponential) one event rolls from the rows whose `eras` include `any` or the player's era, weighted, and opens a dismissible modal. `requires` is optional: fields AND together, and a list matches if the player holds any one id (job, cleared gig, or owned gear). A row with no `requires` is era-only. Effects: money, XP, a percentage of cash, a permanent multiplier on every income stream, a timed multiplier on click, idle $ or idle XP. Safe by construction: balance and spendable XP floor at 0, lifetime XP never falls, the permanent multiplier is clamped to 0.5 to 10, a timed multiplier replaces the one on its target. Cash events wait until money exists. Events never overlap, never fire during a fight (a due one fires 5 seconds after), and a spawning enemy closes an open modal (its effects are already applied). `__GAME__.forceEvent(id)`, `dismissEvent()`.
- **Captions.** There is no flavor line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`; `npm test` checks the size, colour count and outline of every sprite.
