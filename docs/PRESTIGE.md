# Prestige: the Exit (design, v3)

Status: built, behind admin mode (see "Built" at the end). Paths and the Founder track are gone, and so is the win and its Hall of Fame (the company arc was removed).

## Why

A career ends at "own everything", and then there is nothing left to do. The pace model shows the run is front-loaded: jobs and gigs are done on the second visit, and the whole career takes about a day for a player who visits every few hours. The Exit turns that wait into a decision and the finished career into a faster next one.

## The loop

**Exit** the career for **Prestige**, start a new one that earns more, and spend Prestige on **Legacy** perks.

## Prestige

Two numbers, the same split as `xp` / `xpTotal`:

- `prestigeTotal`: every Prestige ever earned. It never falls and it drives the permanent bonus.
- `prestige`: spendable on Legacy perks. Spending never lowers `prestigeTotal` or the bonus.

**Earned on Exit**, from what careers earned (`stats.lifetimeEarned`, every dollar credited; spending ignored):

```
prestigeTotalFor(earned) = floor( cbrt(earned / PRESTIGE_EARN_SCALE) )
prestigeOnExit = prestigeTotalFor(earnedAllRuns + runEarned) - prestigeTotal
```

- **Permanent bonus:** every money and XP stream × `(1 + PRESTIGE_MULT_PER × prestigeTotal)`. It folds in through `modFactors` (`src/game/mods.ts`) like `foreverMult`, so offline credit gets it too.
- Constants: `PRESTIGE_EARN_SCALE = 5e11`, `PRESTIGE_MULT_PER = 0.03`.

## When the Exit opens

When it would pay at least 1 Prestige (first career), and from the start on every later career. It latches: earnings only rise within a career.

## The Exit

A button in the **Prestige** panel on the activity bar (the crown), reading `Exit: +12 Prestige (×1.36 → ×1.72)`, or `Exit: no new Prestige yet` (disabled) on a later career that has not passed the earlier careers' earnings. A confirmation card lists what starts over and what stays; the very first Exit asks twice, and its second card names the losses in words. The button, the crown and the panel show in admin mode only, as before.

After the Exit, a full-screen **headline card**, by what the career earned:

| Earned | Headline |
| --- | --- |
| under 1e12 | "<handle> takes the severance and a very large mug" |
| 1e12 to under 1e14 | "<handle> retires to a standing desk and a quiet calendar" |
| 1e14 and more | "<handle> leaves a legacy, an endowed chair and a very long wiki" |

The handle stays and stays kept: a later career has nothing to draw, so the start card does not reopen.

## What resets and what stays

| Starts over | Stays |
| --- | --- |
| money, `peakMoney`, xp, xpTotal | Prestige, `prestigeTotal`, Legacy perks, careers count |
| skills, gigs, jobs, gear, capital | 10x dev skills |
| click boost, `tempMults`, `foreverMult` | the handle |
| `stats.lifetimeEarned` (summed into `earnedAllRuns`) | every cosmetic, the desk cat, the career timeline's unlocked rows (reveals never replay) |
|  | the career log, with an `exit` entry between careers |

`reset()` stays a full wipe, Legacy included.

## Legacy perks (spend Prestige)

Two tracks, each a ladder; a perk waits on the one before it in its track, is bought once, and applies now and at the start of every career.

| Track | Perks (price in Prestige) |
| --- | --- |
| **Network** (head start) | Study group: skills 1–10 learned (1) · Open portfolio: Portfolio and React, the Gig Board open (2) · Repeat clients: gigs 1–6 cleared, lumps not paid (4) · Return offer: the internship held (7) · Seed money: $1M held (12) |
| **Capital** (idle) | Long weekend: offline cap +4 h, stacking with Time away (2) · Volume discount: capital rows −10% (4) · Bulk hardware: gear rows −10% (7) · Raise season: salaries and retainers ×2 (11) · Compounding: capital rows' income ×1.5 (16) |

66 Prestige for both.

## Save

The optional `legacy` block:

```json
"legacy": {
  "runs": 3,
  "prestige": 14,
  "prestigeTotal": 52,
  "earnedAllRuns": 1.4e14,
  "perks": ["network.skills", "capital.offline"]
}
```

Unknown perk ids are dropped on load (a Founder perk from an old save included), numbers are clamped finite and non-negative, `prestigeTotal >= prestige`, `runs >= 1`. A save without it is career 1 with no Prestige.

## Harness

```ts
getState().legacy: {
  runs: number; prestige: number; prestigeTotal: number; mult: number
  exitOpen: boolean; prestigeOnExit: number
  perks: string[]
}
exit(): number | false          // Prestige earned, or false when the Exit is shut or pays 0
buyLegacy(perkId: string): boolean
setPrestige(n: number): void    // tests only: spendable to n, total raised to at least n
```

## Tuning

`simulateExits` in `src/game/pace.ts` models the Exit over several careers. It exits when an Exit would raise the bonus by 15% or more, buys the cheapest affordable perk after each Exit (Network first on ties), and plays the next career. It stops when a career owns everything. Details and results are in `docs/PACING.md`.

With the product gone, a player who visits every few hours owns everything inside a day, before an Exit would raise the bonus by 15%, so the Exit does not shorten that player's finish. It pays for a player who is away for days (the weekly player in `docs/PACING.md` leaves in career 1 and finishes in career 2).

Knobs: `PRESTIGE_EARN_SCALE`, `PRESTIGE_MULT_PER`. Not the perk prices.

## Decisions

- **Names:** the Exit, Prestige for the points (Rep was unclear), Legacy perks.
- **Rollout:** the Exit UI is behind admin mode (`getAdminMode()`) for now; the harness works regardless.
- **The Exit button lives in the Prestige panel**, which already held it; the Company tab's copy went with the tab.
- **The Founder track and the Hall of Fame are gone** with the product and the win.

## Built

All of the above is built, behind admin mode (`getAdminMode()`); the harness works regardless. Where each piece lives is in `docs/CODEMAP.md`; the numbers are in `docs/GAMEPLAY.md` (player view), `docs/HARNESS.md` (API) and `docs/SAVE.md`.

- **Rules.** `src/data/legacy.ts` (constants, perk table), `src/game/legacy.ts` (the formula, the gate, perk order, the starting grant, headlines, save checks), `src/game/perks.ts` (`perkEffects`: each perk as a number). `exit()` and `buyLegacy()` are store actions; `exit()` builds the next career from the same fresh constants `reset()` uses, then seeds the perks.
- **Where each perk applies.** Network: `startingGrant`/`mergeGrant`. `capital.offline`: `offlineCapMs(gold, base, perks)`, used by the tick, a return, the hydrate and the harness. `capital.capitalCost` and `capital.gearCost`: `capitalBase`/`gearBase` in `economy.ts`, used by the buy actions, the shop's price and affordability, and the next-unlock banner. `capital.salaries` and `capital.capitalIncome`: `idleParts` in `economy.ts`, so `cps`, `clickPower` (which carries the jobs' share of idle) and the owned strip agree.
- **UI.** The Exit button (`ExitButton`) is in the Prestige panel (`PrestigePanel`), which the crown on the activity bar opens (Escape closes it; Escape on the confirmation card closes only the card). The headline card (`ExitHeadline`) is in `App.tsx`; nothing else clears `exitCard`.
- **Pace model.** See `docs/PACING.md`.
