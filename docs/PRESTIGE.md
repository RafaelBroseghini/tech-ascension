# Prestige: the Exit

Status: built, behind admin mode. The rules are in `src/game/legacy.ts` and `src/data/legacy.ts`; this page says why they are shaped this way.

## Why

A career ends when it owns everything, and then there is nothing left to do. For a player who visits every few hours, that is about a day in, so the wait for a next career is short anyway. The Exit turns the finished career into a decision: leave, keep a permanent bonus, and start a career that can go further. Perks are the place to spend the bonus, so a second career starts with something earned rather than only with time.

## The loop

**Exit** the career for **Prestige**, start a new one, and spend Prestige on **Legacy** perks.

## Prestige

Two numbers, the same split as spendable and lifetime XP:

- `prestigeTotal`: every Prestige ever earned. It never falls, and it drives the permanent bonus.
- `prestige`: spendable on Legacy perks. Spending never lowers `prestigeTotal` or the bonus.

**What an Exit pays** comes from what careers earned in dollars (credited, spending ignored), through a cube root over one scale constant. So an Exit pays the rungs this career climbed, not the whole career again. The bonus is a per-Prestige percentage on every money and XP stream. It folds in through `modFactors` (`src/game/mods.ts`), like the event multipliers, so the offline credit gets it too.

## When the Exit opens

When it would pay at least one Prestige. On the first career that is the first rung; on a later career it waits until the earnings cross the next one. It latches: earnings only rise within a career, so once open it stays open.

## The Exit

The **Exit** button sits in the **Prestige** panel, opened by the crown on the activity bar. The button shows what the Exit would pay and what the bonus would become, or says there is no new Prestige yet. A confirmation card lists what starts over and what stays. The first Exit asks twice, and the second card names the losses in words. After the Exit, a headline card closes the career, worded by what it earned. The handle stays and stays kept, so the start card does not open again.

## What starts over and what stays

| Starts over | Stays |
| --- | --- |
| Money, the peak balance, XP and lifetime XP | Prestige, the bonus, and the count of careers |
| Skills, gigs, jobs, gear, capital | 10x dev skills |
| The click boost, event multipliers | The handle |
| Lifetime earnings for the career (summed into the all-careers total) | Every cosmetic and the desk cat, and the career timeline's unlocks (reveals never replay) |
| | The career log, with an `exit` entry between careers |

`reset()` is a full wipe, Legacy included.

## Legacy perks

Two tracks, each a ladder. A perk waits on the one before it in its track, is bought once, and applies now and at the start of every career. **Network** is a head start: skills, gigs, the internship, starting money. **Capital** is idle income: offline cap, capital and gear prices, salaries and retainers, capital income. The perk table, prices and effects are in `src/data/legacy.ts` (`LEGACY_PERKS`) and `src/game/perks.ts` (`perkEffects`).

Where each perk applies is a design fact worth knowing: starting grants are applied when a career begins; the offline cap is read on every return; price perks are read by the buy actions and the shop's price; income perks are read by the idle calculation, so the shop, the click power and the owned strip all agree.

## Save

The optional `legacy` block is described in [SAVE.md](SAVE.md). An Exit clears `foreverMult` and keeps the handle; `reset()` drops the block.

## Tuning

`simulateExits` in `src/game/pace.ts` plays the Exit over several careers, and [PACING.md](PACING.md) has the results. For a player who visits every few hours the Exit never opens before the career is already done, so it does not shorten that player's finish. It pays for a player who is away for days. The Exit's scale and per-Prestige constants were tuned for longer careers and have not been retuned since the career became about a day. Perk prices are not the knob to turn; the scale and per-Prestige constants are.

## Decisions

- **Names:** the Exit, Prestige for the points, Legacy perks for what they buy.
- **Rollout:** the Exit UI is behind admin mode for now. The harness works regardless.
- **The Exit button lives in the Prestige panel.** The company tab that used to hold it is gone.
- **The Founder track and the Hall of Fame are gone** with the company arc.
