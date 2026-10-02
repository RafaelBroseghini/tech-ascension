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

The economy is phase-gated. Numbers live in `src/data/phases.ts` (A to C) and `src/data/tiers.ts` (D); every repeatable item costs `floor(base × 1.15 ^ owned)`.

| Phase | Pays in | You buy | Opens when |
| --- | --- | --- | --- |
| **A Skill grind** | XP only | 18 skills (XP/click, XP/s) | start |
| **B Gigs** | first $ | 8 gigs: lump $ on clear, some add a retainer $/s | 12,000 lifetime XP and Portfolio (#11) + React (#12) owned |
| **C Jobs + gear** | salary $/s | 8 jobs (held once) and 5 equipment items | 35,000 lifetime XP and 5 gigs cleared |
| **D Capital** | heavy $/s | the old mid-to-Mars ladder (tiers 19-66) | a senior job (id >= 7) OR $500,000 held at some point |

- **Clicks.** In phase A a click is study time: it pays XP (`1 + skills`) and money stays $0, with no $/s. The first cleared gig turns clicks into money (`$1 + equipment + capital bonuses`), with a 25% XP drip. Boosts multiply whichever one the click pays.
- **XP.** Skills cost XP, so spending lowers the balance, but gates and job requirements read lifetime XP (`xpTotal`) and never go down. Skills keep studying (XP/s) in every phase, including offline.
- **Gigs** clear once, by pressing "Clear gig" when XP and the number of already-cleared gigs allow it. Gig 5 (site maintenance retainer) is the first idle money.
- **Shop.** Four tabs, one per phase: Skills, Gigs, Jobs (roles plus equipment), Capital (with era sub-tabs). A locked tab shows what it needs, with the requirements ticking off. A newly opened phase takes over the tab. Skills and capital rows appear when they are within reach and carry a `New` tag.
- **Stage.** The stage shows the highest capital tier you own, else the furthest job, gig or skill, in pixel art, in front of a fixed Catppuccin Mocha IDE whose editor buffer changes with progress (see Art). Before the first purchase it shows the opening attic scene (art 0) and the stage name stays High school. Buying a new top item plays a reveal burst.
- **Rare enemies** spawn once money exists (never in phase A), roll among the current era's enemies (`early` until a capital tier is owned), and pay dollars on a win.
- Click boosts (`×2` / `×5` / `×10`) multiply **click payout only**. Idle income is unchanged. One boost at a time; the next roll replaces the slot after the current one ends. A toast, a chip over the sprite, a rim light circling the art and the metrics strip show the multiplier while it runs.
- Coming back credits idle $ and idle XP for up to 8 hours and toasts `welcome back, credited $X`.

### Money pops (Balatro feel)

- **Raw digits first.** `formatNumber` keeps whole numbers as raw digits with separators (`1,234,567`) up to 9,999,999, then abbreviates (`10M`, `1.5B`, ... `Qa`). `formatNumber(v, 1000)` / `formatCompact` give the old tight K/M form.
- **Medium on a click** once money exists: the hero total squashes and rebounds (about 190ms).
- **Large** on a gig clear, a fight win and a phase unlock: a centered slam-in pop (`+$1,200`, `Gig cleared`) with a chromatic red/cyan split that converges, a bigger squash on the hero total, a count-up of the running total that overshoots then settles, plus the confetti burst and ring.
- **Never per idle tick.** Idle income just moves the number. `prefers-reduced-motion` turns the pops into a plain fade.
- The pop kinds are `MONEY_POP` in `src/data/phases.ts`; the last one is exposed as `__GAME__.getState().lastPop`.

## Where to edit

| What | File |
| --- | --- |
| Phase A-C tables (skills, gigs, jobs, equipment, gates) | `src/data/phases.ts` |
| Phase D capital ladder (tiers 19-66) | `src/data/tiers.ts` |
| Which sprite each skill, gig, job and equipment item uses | `src/data/art.ts` |
| Sprite URLs (`spriteForTier`, `thumbForTier`) and era accents | `src/data/sprites.ts` |
| Which code snippet the editor shows for each stage, and its syntax colours | `src/data/overlays.ts` |
| The IDE chrome (activity bar, tree, tabs, statusline) | `src/components/IdeChrome.tsx`, `src/styles/ide.css` |
| Pixel art: palette, drawing helpers, one drawing per tier | `src/pixel/` (`palette.ts`, `pix.ts`, `motifs.ts`, `art.ts`) |
| Click waterfall rules (cap, count, owned ids) | `src/game/waterfall.ts` |
| Design tokens (type scale, spacing, era palettes, easing, elevation) | `src/styles/tokens.css` |
| Keyframes and the `prefers-reduced-motion` kill switch | `src/styles/motion.css` |
| Phase screenshots (A XP, B gig pop, C jobs, D capital, fight pop) through `__GAME__` | `node scripts/capture-visuals.mjs <prefix> [outDir]` |
| Boost rates by era | `src/data/boosts.ts` |
| Cost, click power, idle, XP rates | `src/game/economy.ts` |
| Gates, phase, stage | `src/game/phase.ts` |
| Number formatting (raw digits cutoff) | `src/game/format.ts` |
| Save, migration, offline credit | `src/game/save.ts` |
| Loop, purchases, money pops | `src/game/store.ts` |
| Centered score pop and hero squash | `src/components/ScorePop.tsx`, `src/components/HeroMoney.tsx` |

Replacing `TIERS` is enough for the capital shop, as long as each row has `id`, `era`, `name`, `baseCost`, `cps`, and `clickBonus`. Add a drawing for the new id in `src/pixel/art.ts` (it falls back to tier 1 art until you do) and add a `fromTier` band in `src/data/overlays.ts` if it should start a new code snippet. Capital counts are stored by tier id, so new ids do not need a save migration. Skills, gigs, jobs and equipment borrow existing drawings through `src/data/art.ts`.

### What happened to the old early tiers

Tiers 1-18 (Used laptop ... Hacker Newz front page) are retired. Their content is the new phases: the 18 skills, the gigs, the jobs and the equipment. Their 18 drawings are not dead: each skill uses one of them (art ids 1-18) and gigs, jobs and equipment reuse them, which also keeps the first three IDE snippets (`fizzbuzz.py`, `two_sum.py`, `reverse_list.go`) in play. The old mid-to-end ladder (tiers 19-66) is Phase D unchanged, apart from tier 19 being renamed "Junior ML engineer" so it does not clash with the Junior SWE job. Nothing is unreachable.

## Save

`localStorage` key `tech-ascension.save`, schema version 3:

```json
{
  "version": 3,
  "money": 0,
  "xp": 0,
  "xpTotal": 0,
  "skills": { "1": 2 },
  "equipment": { "1": 1 },
  "owned": { "26": 1 },
  "jobs": [1, 2],
  "gigs": [1, 2, 3],
  "savedAt": 0,
  "activeBoost": { "mult": 5, "endsAt": 0 },
  "peakMoney": 0
}
```

`peakMoney` is optional; older saves without it start from their current balance. `src/game/save.ts` migrates an unversioned blob (including a legacy owned array) up to the current version. Version 2 added 18 dev-culture stages, which shifted most tier ids, so loading a version 1 save re-keys `owned` through `V1_TO_V2_TIER_IDS`. That table is frozen history: never edit it.

**Version 3 (phase economy) is a soft reset of the early game with an XP refund.** The retired early generators (ids 1-18) are removed, and everything they cost is paid back as XP at 0.25 XP per dollar (`LEGACY_EARLY_XP_PER_DOLLAR`, priced from the frozen `V2_EARLY_BASE_COSTS`). The old vanity XP counter is replaced by that refund. Money, `peakMoney`, boosts and every capital tier (ids 19+) carry over unchanged. The refund is deliberately a spendable XP balance rather than an unlock: it buys skills, skills open the boards, and the player replays phases A to C quickly. Nobody is softlocked: XP always buys a skill, and anyone who owns a capital tier (or has held $500K) already has Phase D open. Money from the old save still funds jobs, equipment and capital later, and while money exists clicks pay money. A toast says what happened (`phase economy: early gear retired, refunded N XP`), once, because the rewritten save is version 3.

When you add a stage, bump `SAVE_VERSION`, add a migration, and keep the sprite files named by the new ids. On load, `activeBoost` is dropped when `endsAt <= Date.now()`. Offline pay uses `savedAt`, ignores click boosts, and caps the gap at 8 hours.

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

Clicks register on pointer-down. The sprite bumps up, tips slightly away from the click point and settles with a tiny jitter (~260ms, restarted instantly on every click), flashes brighter, and sends out a flat ring, square sparks, a drifting `$` / XP payout, and the click waterfall: the 32×32 pixel thumb of a random owned tier spawns at the cursor and falls for 300ms under gravity (x drifts, y follows t²) while fading out. One thumb per click, one or two more during a boost, never more than 14 alive at once (the oldest is dropped). Fast clicking builds "heat", which makes the bump a little bigger and strengthens the glow around the sprite. Idle, the sprite floats, an aura breathes and motes rise. An active click boost adds a chip over the sprite, a rotating rim light, bigger payouts, and a lit metrics cell. Buying sweeps the row and ticks the money and owned figures. A new highest tier remounts the art with a reveal burst. New shop rows slide in with a `New` tag. Moving to a new era cross-fades the accent and wipes it across the stage, and the editor buffer cross-fades to the next snippet (260ms) while the IDE chrome stays put. `prefers-reduced-motion` kills CSS animation globally, hides the particles and the waterfall and skips the bump, keeping a short click flash.

## Art

Everything is pixel art, drawn in code from one shared 16-colour sheet (`src/pixel/palette.ts`: ink `#1a1c2c` outlines, era accents early `#41a6f6`, mid `#38b764`, upper `#b13e53`, q3 `#ffcd75`, end `#ef7d57`, boost glow `#73eff7`). No image files ship; the IDE is CSS.

- **Sprites.** `src/pixel/art.ts` has one 64×64 drawing per tier plus art 0 (the opening attic), built from shared props in `motifs.ts`, lit from the top-left. The 32×32 thumb is the same drawing reduced 2:1. Both get a 1px ink outline, no anti-aliasing and at most 16 colours, and are encoded as small PNG data URLs once and cached. CSS uses `image-rendering: crisp-edges` then `pixelated`, and the stage sprite is always a whole multiple (3×) of its 64px grid.
- **IDE chrome and code overlays.** One fixed Catppuccin Mocha shell (`#1e1e2e` base) sits behind the stage: activity bar, ghost file tree, tab bar and statusline, in plain HTML/CSS. It never reads the era accent. Only the editor buffer changes: 15 snippets from the IDE overlays brief live in `src/data/overlays.ts` and are tokenized into mauve keywords, green strings, peach numbers, sky operators, rosewater types and blue calls, set in JetBrains Mono. The snippet is chosen by the stage's art id (the highest capital tier, or the art of the furthest skill, gig or job), in bands that never cross an era (a band is a `fromTier` and runs until the next one), so the buffer only changes when you progress and never rotates at random. Early (the art ids that skills, gigs and early jobs use): `fizzbuzz.py` (nothing bought to art 6), `two_sum.py` (7 to 12), `reverse_list.go` (13 to 18). Mid: `debounce.ts` (19 to 22), `BinarySearch.java` (23 to 26), `worker_pool.go` (27 to 30), `finetune_loop.py` (31 to 33). Upper: `rate_limit.ts` (34 to 36), `lru.rs` (37 to 40), `attention.py` (41 to 44). Scale: `gemm.cu` (45 to 49), `consensus.go` (50 to 53). Endgame: `edge_route.ts` (54 to 58), `orbital_sync.py` (59 to 62), `habitat_ctl.rs` (63 to 66). The active tab shows the snippet filename and the statusline shows its language. Changing snippet fades the old buffer out and the new one in over 260ms. The buffer is dimmed so the sprite, money and owned strip stay readable.
- **Captions.** There is no flavor line under the stage art. The stage name and era tag remain.

To change a sprite, edit its entry in `DRAW` in `src/pixel/art.ts`; `npm test` checks the size, colour count and outline of every sprite.
