# Prestige: the Exit (design, v2)

Status: built, behind admin mode (see "Built" at the end). Part of the company arc (`docs/COMPANY_ARC.md`). Paths are dropped.

## Why

A career ends at "own everything", or at the 7B win, and then there is nothing left to do. The pace model shows the run is front-loaded: jobs and gigs are done on the second visit, and most of the remaining days wait on the last capital rows. The Exit turns that wait into a decision and the finished career into a faster next one.

## The loop

Every career builds one product. **Exit** it (sell the company) for **Prestige**, start a new career with a new product that grows and earns more, and spend Prestige on **Legacy** perks. The long goal is to win the world all three ways (the three endings).

## Prestige

Two numbers, the same split as `xp` / `xpTotal`:

- `prestigeTotal`: every Prestige ever earned. It never falls and it drives the permanent bonus.
- `prestige`: spendable on Legacy perks. Spending never lowers `prestigeTotal` or the bonus.

**Earned on Exit**, from what careers earned (`stats.lifetimeEarned`, every dollar credited; spending ignored), plus a one-time bonus per ending:

```
prestigeTotalFor(earned) = floor( cbrt(earned / PRESTIGE_EARN_SCALE) )
prestigeOnExit = prestigeTotalFor(earnedAllRuns + runEarned) - prestigeTotal + endingBonus
```

- `endingBonus`: when this career reached the 7B win with an ending (`founder`, `nightOwl`, `sponsor`, from `src/game/globe/hires.ts`) not yet in the Hall of Fame, `ENDING_BONUS` (5) Prestige, once per ending, ever.
- **Permanent bonus:** every money and XP stream, and product growth, × `(1 + PRESTIGE_MULT_PER × prestigeTotal)`. It folds in through `modFactors` (`src/game/mods.ts`) like `foreverMult`, so offline credit gets it too.
- Constants: `PRESTIGE_EARN_SCALE = 5e11`, `PRESTIGE_MULT_PER = 0.03`. They were kept after the sweep in `docs/PACING.md`.

## When the Exit opens

When it would pay at least 1 Prestige (first career), and from the start on every later career. It latches: earnings only rise within a career.

## The Exit: selling the product

A button in the **Company** tab (where the product lives) and in the **Prestige** panel on the activity bar, reading `Sell Otterly: +12 Prestige (×1.36 → ×1.72)`, or `Sell Otterly: no new Prestige yet` (disabled) on a later career that has not passed the earlier careers' earnings. A confirmation card lists what starts over and what stays; the very first Exit asks twice, and its second card names the losses in words.

After the Exit, a full-screen **headline card**, by how far the product got:

| The product | Headline |
| --- | --- |
| under 1M users | "<handle> acqui-hired; <Product> sunset 'to focus on the core'" |
| 1M to under 1B | "<Product> acquired; <handle> stays on as 'advisor'" |
| 1B to under 7B | "<Product> sold in a blockbuster deal" |
| won, `founder` | "<handle> sells <Product>, the app seven billion people use" |
| won, `nightOwl` | "<handle> sells the side project seven billion people use. Get some sleep." |
| won, `sponsor` | "<Product> sold; its team thanks their executive sponsor" |

A new ending also shows "New in the Hall of Fame: <ending>" and its bonus.

Then the start card's product beat opens: a new product name is drawn (Reroll as usual), the handle stays. Every career is a new product.

## What resets and what stays

| Starts over | Stays |
| --- | --- |
| money, `peakMoney`, xp, xpTotal | Prestige, `prestigeTotal`, Legacy perks, careers count, Hall of Fame |
| skills, gigs, jobs, gear, capital | 10x dev skills |
| the product: users, regions, hires, `hiredUsers`, resistance, incidents, the win and its multiplier | the handle (a new product name is drawn) |
| the track (back to `ladder`), burn, bridges and their equity cost | every cosmetic, the desk cat, the career timeline's unlocked rows (reveals never replay) |
| click boost, `tempMults`, `foreverMult` | the career log, with an `exit` entry between careers |
| `stats.lifetimeEarned` (summed into `earnedAllRuns`) | LinkedOut (each sold product stays as a past "Founder, Otterly" or "Side project" line) |

`reset()` stays a full wipe, Legacy and Hall of Fame included.

## Legacy perks (spend Prestige)

Three tracks, each a ladder; a perk waits on the one before it in its track, is bought once, and applies now and at the start of every career.

| Track | Perks (price in Prestige) |
| --- | --- |
| **Network** (head start) | Study group: skills 1–10 learned (1) · Open portfolio: Portfolio and React, the Gig Board open (2) · Repeat clients: gigs 1–6 cleared, lumps not paid (4) · Return offer: the internship held (7) · Seed money: $1M held (12) |
| **Founder** (the product and the fork) | Early adopters: each product starts with 1,000 users, so the fork can open with the first job (2) · Lean team: founder burn −25% (4) · Friendly investors: the first bridge of each career costs no equity (7) · Viral loop: product growth ×1.5 on both tracks (11) · Platform: product revenue ×1.5 (16) |
| **Capital** (idle) | Long weekend: offline cap +4 h, stacking with Time away (2) · Volume discount: capital rows −10% (4) · Bulk hardware: gear rows −10% (7) · Raise season: salaries and retainers ×2 (11) · Compounding: capital rows' income ×1.5 (16) |

106 Prestige for all three.

## Hall of Fame (the long goal)

The three endings, each recorded the first time a career wins with it: **Founder** (you built it), **Night owl** (nights and weekends, mostly your own growth), **Executive sponsor** (mostly hired growth). Owning all three is the game's long finish. It is shown in the Prestige panel, with `???` for each ending not yet won.

The fork already makes careers play differently (ladder or founder, hires or not), so v1's Paths are dropped: the endings are the paths.

## Save

The optional `legacy` block, added without a version bump:

```json
"legacy": {
  "runs": 3,
  "prestige": 14,
  "prestigeTotal": 52,
  "earnedAllRuns": 1.4e14,
  "perks": ["network.skills", "founder.users"],
  "endings": ["founder"]
}
```

Unknown perk ids and endings are dropped on load, numbers are clamped finite and non-negative, `prestigeTotal >= prestige`, `runs >= 1`. A save without it is career 1 with no Prestige.

## Harness

```ts
getState().legacy: {
  runs: number; prestige: number; prestigeTotal: number; mult: number
  exitOpen: boolean; prestigeOnExit: number
  perks: string[]; endings: ("founder" | "nightOwl" | "sponsor")[]
}
exit(): number | false          // Prestige earned, or false when the Exit is shut or pays 0
buyLegacy(perkId: string): boolean
setPrestige(n: number): void    // tests only: spendable to n, total raised to at least n
```

## Tuning

`simulateExits` in `src/game/pace.ts` models the Exit over several careers. It exits when an Exit would raise the bonus by 15% or more, buys the cheapest affordable perk after each Exit (Network first on ties), and plays the next career. It includes product users, revenue, growth and the win, and it models only the night owl ending. Details and results are in `docs/PACING.md`.

Targets for the Regular player (3 visits a day of 15 minutes, 2 clicks/s), and where they stand:

- first Exit around day 1.5 to 2: met (day 1.67 and 2.00);
- career 2 reaches the point where career 1 exited in under half the time: not met for earnings, met for capital row 6;
- the career that owns everything (or wins the world, whichever is later) is career 4 to 6, about 2 weeks: met (career 6, day 12.7 and 16.3);
- all three endings in about a month: not checked, since the model has no fork or hires.

Knobs: `PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER`, `ENDING_BONUS`. Not the perk prices.

## Decisions

- **Names:** the Exit (in the UI, "Sell <Product>"), Prestige for the points (Rep was unclear), Legacy perks, Hall of Fame.
- **The Craft track is replaced by the Founder track.**
- **Paths are dropped**: the ladder/founder fork and the three endings already make careers differ.
- **Rollout:** the Exit UI is behind admin mode (`getAdminMode()`) for now; the harness works regardless.

## Built

All of the above is built, behind admin mode (`getAdminMode()`); the harness works regardless. Where each piece lives is in `docs/CODEMAP.md`; the numbers are in `docs/GAMEPLAY.md` (player view), `AGENTS.md` (API) and `docs/SAVE.md`.

- **Rules.** `src/data/legacy.ts` (constants, perk table, Hall of Fame), `src/game/legacy.ts` (the formula, the ending bonus, the gate, perk order, the starting grant, `withStartUsers`, headlines, save checks), `src/game/perks.ts` (`perkEffects`: each perk as a number). `exit()` and `buyLegacy()` are store actions; `exit()` builds the next career from the same fresh constants `reset()` uses (`FRESH_COMPANY`, `FRESH_FOOTPRINT`, `FRESH_FOUNDER`), so every company field comes back to fresh, then seeds the perks.
- **Where each perk applies.** Network: `startingGrant`/`mergeGrant`. `founder.users`: `withStartUsers`, a top-up to 1,000 at the home region (`americas-east`), when bought and at each career start. `founder.burn`: `burnOf(users, mult)` in `track.ts`, through `TrackFacts.burnMult` into `stepCompany`, `founderOutlook`, the fork's numbers and the bridge cash. `founder.bridge`: `raiseBridge` (the first bridge of a career adds no equity cut; the bridge count and the cash still count). `founder.growth` and the permanent bonus: `trackFactsOf(founder, legacy)` scales the growth multiplier once, the hires' part with it, so the hires' share of the growth is unchanged. `founder.revenue`: `TrackFacts.revenueMult` for what is credited, `productRevenueOf(…, perks)` for what is shown. `capital.offline`: `offlineCapMs(gold, base, perks)`, used by the tick, a return, the hydrate and the harness. `capital.capitalCost` and `capital.gearCost`: `capitalBase`/`gearBase` in `economy.ts`, used by the buy actions, the shop's price and affordability, and the next-unlock banner. `capital.salaries` and `capital.capitalIncome`: `idleParts` in `economy.ts`, so `cps`, `clickPower` (which carries the jobs' share of idle) and the owned strip agree.
- **UI.** The Sell button (`SellButton`) is in the Company tab and in the Prestige panel (`PrestigePanel`), which the crown on the activity bar opens (Escape closes it; Escape on the confirmation card closes only the card). The Legacy sub-tab of Capital is gone. The headline card (`ExitHeadline`) waits for the start card: the start card does not mount until it is dismissed, and nothing else clears `exitCard` (a store test and a component test pin that). After an Exit the start card opens on the product beat and `rerollProfile()` is refused (the handle stays); `rerollProduct()` works.
- **Pace model.** See `docs/PACING.md`: `simulateExits` now models the product with the real `advanceCompany`, buys the cheapest affordable perk across tracks, and finishes when a career owns everything and has won the world.
- **Constants.** `PRESTIGE_EARN_SCALE = 5e11`, `PRESTIGE_MULT_PER = 0.03`, `ENDING_BONUS = 5`: v1's values, unchanged after the sweep in `docs/PACING.md`.

Choices the spec left open, and where the build differs:

- **The bonus is not a rung.** The spec's `prestigeTotalFor(earned) − prestigeTotal + endingBonus` would count an ending bonus in `prestigeTotal`, so the bonus would eat the next earnings Prestige. The build subtracts the bonuses already paid (`ENDING_BONUS × endings.length`) from `prestigeTotal` before it takes the difference, so the bonus is paid on top.
- **Product revenue is not multiplied by the permanent bonus.** The bonus folds into `modFactors` (clicks, idle $/s, XP/s, the offline credit) and into growth. Revenue from users stays as the arc defines it (track, equity, Platform), as it already ignores the win's `foreverMult`. Multiplying growth already raises revenue through the user count.
- **A win opens the first Exit** (its bonus is at least 1 Prestige), through both the gate and the `exit` timeline row.
- **Only the night owl ending is modeled** by the pace model, so "all three endings in about a month" is not checked, and career 2 reaching career 1's earnings in under half the time is not met (it is met for capital row 6). Both are explained in `docs/PACING.md`.
- **LinkedOut keeps the past products.** It lists each sold product under Experience, newest first, from the journal's `exit` entries (`pastProductsOf`): "Founder, <Product>" (or the sponsor line) for one that won, "Side project, <Product>" for one sold before that. GitHug is unchanged. The How to play card does not name the Hall of Fame, since the Exit is admin only for now.
- **Regions bought reset with the Exit** (`footprint` back to the free home region with Ashburn), because the spec lists "regions" among what starts over.
