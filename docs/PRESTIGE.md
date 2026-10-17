# Prestige: the Exit (design, v2)

Status: proposal, reworked for the company arc (`docs/COMPANY_ARC.md`). A first version was built on the branch `worktree-bridge-cse_0189znxqaYqCP9B8nbar1tsp` (commits `23b73b7`, `9beeebb`, and the unfinished `beb3cc4`) before the globe reached `main`. Its pure rules, save block, harness, pace mode and UI are reused here; its interview parts and Paths are dropped.

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

- `endingBonus`: when this career reached the 7B win with an ending (`founder`, `nightOwl`, `sponsor` from `src/game/globe/hires.ts`) not yet in the Hall of Fame, `ENDING_BONUS` (start at 5) Prestige, once per ending, ever.
- **Permanent bonus:** every money and XP stream, and product growth, × `(1 + PRESTIGE_MULT_PER × prestigeTotal)`. It folds in through `modFactors` (`src/game/mods.ts`) like `foreverMult`, so offline credit gets it too.
- Starting constants from v1's tuning: `PRESTIGE_EARN_SCALE = 5e11`, `PRESTIGE_MULT_PER = 0.03`. Product revenue and the win multiplier changed the economy, so they are re-tuned (see Tuning).

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
| `stats.lifetimeEarned` (summed into `earnedAllRuns`) | GitHug and LinkedOut (each product is a past "Founder, Otterly" / "Side project" line) |

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

The three endings, each recorded the first time a career wins with it: **Founder** (you built it), **Night owl** (nights and weekends, mostly your own growth), **Executive sponsor** (mostly hired growth). Owning all three is the game's long finish. The How to play card names it; Sabbatical stays the last trophy of a single career.

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

`simulatePace`'s multi-run mode (`simulateExits` in `src/game/pace.ts`) exits when an Exit would raise the bonus by 15% or more, buys the cheapest affordable perk after each Exit (Network first on ties), and plays the next career. It has to include product revenue, product growth and the win if `simulatePace` does not yet (check; if the globe is not modeled, model served users and revenue with the real `stepCompany`, or state plainly what is left out).

Targets for the Regular player (3 visits a day of 15 minutes, 2 clicks/s):

- first Exit taken around day 1.5 to 2;
- career 2 reaches the point where career 1 exited in under half the time;
- the career that owns everything (or wins the world, whichever is later) is career 4 to 6, about 2 weeks;
- all three endings: about a month.

Knobs: `PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER`, `ENDING_BONUS`. Not the perk prices.

## Decisions

- **Names:** the Exit (in the UI, "Sell <Product>"), Prestige for the points (Rep was unclear), Legacy perks, Hall of Fame.
- **The globe replaced the whiteboard interviews** (#59), so nothing about interviews carries over, and v1's Craft track (interview and click perks) is replaced by the Founder track.
- **Paths are dropped**: the ladder/founder fork and the three endings already make careers differ.
- **Rollout:** behind admin mode (`getAdminMode()`) until the pace model meets the targets; the harness works regardless.
