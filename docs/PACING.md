# Pacing: how long the game takes

How many days of real time it takes to own everything, for someone who does not sit at the game all day: they open it, click and shop for a while, leave, and come back.

"Own everything" is the game's own finish line for the shop (`ownsEverything` in `src/game/nextUnlock.ts`): every skill, gig, job, gear row and capital row held at least once. It is the same test that unlocks Auto-click. Second copies are optional.

A career finishes the day it owns everything. The formula below and the model both date that day.

## The opening

The first minutes are paced separately from the days below: a new player decides in the first few minutes whether there is a second visit. Gigs ask for 9,900 XP less than the tables write (`openingGigXp` in `src/data/costs.ts`) and keep the table's spacing; the first seven job ranks follow a staircase (`openingJobXp`); the first skills cost fewer clicks (`earlyGrind` in `src/data/phases.ts`) and the first eight skills pay their full XP/s. Playing it as the Next banner does (skills 1 to 16 in order, then the cheapest affordable, two clicks a second), the Gig Board opens at about 3.0 minutes, the first gig is ready at 3.0, a new gig follows every 7 to 18 seconds (26 in the first five minutes after it), the Job Board opens at 4.6 and the first job is ready then, with the next five ranks 15 to 25 seconds apart. An earlier version scaled every gate to 15% of the table; that put 26 gigs inside two minutes and the first seven jobs inside seconds. The tests that pin the gates import them from the data modules.

## The formula

```
days ≈ K / pace

pace = idleShare + clicksPerWallSecond × s
```

- **idleShare** is the share of the day the game earns idle income. Each visit earns while you are there, and when you come back the time you were away pays too, but only up to the 8 hour offline cap. Over a repeating pattern of visits and gaps:

  ```
  idleShare = Σ (visit + min(gap, 8 h)) / Σ (visit + gap)
  ```

  For visits evenly spaced `n` times a day, each lasting `a` hours, the gap is `24/n − a`.
- **clicksPerWallSecond** is your clicking averaged over the whole day: clicks per second × (time at the game ÷ time in the cycle).
- **s = 0.575** is what a click adds once every job the model's career can see is held: the sum of the jobs' `clickPct`, as a fraction of idle $/s (`FINAL_CLICK_SHARE`). The model plays an individual contributor, who skips the four manager rows (it was 0.68 with the whole ladder). Jobs are the only source of that share, so clicking is worth much more late in the game than early.
- **K** is a constant in days that says how well you reinvest:

  | Player | K | Who they are |
  | --- | --- | --- |
  | Collector | 0.8 | Buys what the shop lists and a second copy only when it earns itself back within an hour, which is almost never |
  | Reinvestor | 0.9 | Also re-buys anything that earns itself back within two days |

  Both are under a day because a career is about a day long now (the capital tail was cut, see "Changing the pace"), and the two are close because there is no longer time for a second copy to repay itself: the lifetime XP that the last skill waits on, a day in, sets the floor for both. The old constants were 9 and 4, when the last capital row took days.

Worked example, three visits a day of 15 minutes, clicking twice a second. The cycle is 8 hours, so you are away 7.75 hours, under the cap, and `idleShare` is 1. You click 2 × 900 s × 3 visits = 5,400 times a day, which is 0.0625 clicks per wall-clock second. `pace = 1 + 0.0625 × 0.575 = 1.04`, so a reinvestor needs about 0.9 / 1.04 = 0.9 days and a collector about 0.8 / 1.04 = 0.8 days.

Once a day for 30 minutes: you are away 23.5 hours but only 8 count, so `idleShare = (0.5 + 8) / 24 = 0.35`. Clicking adds `2 × 0.5 / 24 × 0.575 = 0.02`. `pace = 0.38`, which is 2.4 days for a reinvestor and 2.1 for a collector.

## What it gives

Days of real time, from the model (`src/game/pace.ts`) and from the formula. Each player column reads "finish / owns everything / formula": the finish is the day everything is owned (the two agree), and the formula is about owning everything. "Hands-on to finish" is the time actually spent at the game, visits × minutes, until the finish. The stacker (reinvestor) re-buys anything that repays within two days; the one-of-each player (collector) within an hour. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Stacker: finish / owns everything / formula | One-of-each: finish / owns everything / formula | Hands-on to finish (stacker / one-of-each) | Longest wait, visits (stacker / one-of-each) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.29 | 0.6 / 0.6 / 0.7 days | 0.5 / 0.5 / 0.6 days | 3.8 h / 3.0 h | 1 / 1 |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.14 | 0.8 / 0.8 / 0.8 days | 0.7 / 0.7 / 0.7 days | 100 min / 80 min | 0 / 0 |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 1.0 / 1.0 / 0.9 days | 0.7 / 0.7 / 0.8 days | 45 min / 30 min | 0 / 0 |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 1.5 / 1.5 / 1.3 days | 1.5 / 1.5 / 1.1 days | 30 min / 30 min | 0 / 0 |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 2.0 / 2.0 / 2.4 days | 3.0 / 3.0 / 2.1 days | 61 min / 90 min | 0 / 0 |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 3.0 / 3.0 / 2.6 days | 3.0 / 3.0 / 2.3 days | 30 min / 30 min | 0 / 0 |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 6.0 / 6.0 / n/a days | 6.0 / 6.0 / 4.2 days | 90 min / 90 min | 0 / 0 |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 21.0 / 21.0 / n/a days | 35.0 / 35.0 / 14.8 days | 90 min / 2.5 h | 0 / 0 |

The finish is a whole number of visits, so a schedule with a long gap between visits reads in steps and the formula is only close, within about a third (the test allows 35%, and half for the player who leaves it open all day: the formula is a closed form of a few visits, and the lifetime-XP gate on the last skill sets a floor it does not see).

**Longest wait** is the most visits in a row that bought no first copy of anything (a skill, gig, job, gear or capital row) before the career owned everything. The model only buys at visits, so a wait is counted in visits. A career that ends in a day should never come back to nothing new: for the target player (4 visits a day of 5 minutes, 2 clicks a second) both players wait 0 visits and own everything on day 1.00, and `pace.test.ts` pins at most 1. The wait stops counting once everything is owned.

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached. The full table run ends with the best-fit `K` for each player, over the schedules that visit at least daily.

**The leadership line.** The model picks a line when it first holds Senior SWE (`PaceOptions.leadership`, default `ic`; `DEFAULT_PACE_LEAD`). An IC holds 27 rows instead of 31 (the manager rows 18, 20, 21 and 22 are never bought), so the shop is a little cheaper and the click share at the end is 0.575 instead of 0.68. For the target player (4 visits a day of 5 minutes, 2 clicks a second) the day everything is owned is 1.00 on either line, since the model buys at visits a quarter day apart.

## Pace by build

`npm run pace -- builds [visits minutes clicks]` plays every specialization on each leadership line and prints the day it owns everything. For the target player:

| Specialization | Style | ic oneOfEach | ic stacker | manager oneOfEach | manager stacker |
| --- | --- | --- | --- | --- | --- |
| Frontend | click | 0.75 | 1.00 | 0.75 | 1.00 |
| Backend / Platform | balanced | 1.00 | 1.00 | 1.00 | 1.00 |
| Infra / SRE | idle | 1.00 | 1.00 | 1.00 | 1.00 |
| AI engineer | idle | 1.00 | 1.00 | 1.00 | 1.00 |
| Forward deployed engineer | click | 0.75 | 1.00 | 0.75 | 1.00 |
| Security | balanced | 1.00 | 1.00 | 1.00 | 1.00 |

The model buys at visits, so days read in quarters. A click build owns everything one visit sooner for the collector, since its clicks pay more. Every build on either line finishes, and `pace.test.ts` keeps a Manager within 10% of the IC for every specialization, so neither line is a dead end. The model does not play the kitchen's combo bonuses.

## Over several careers (the Exit)

`simulateExits` in `src/game/pace.ts` plays the same player through the Exit (`docs/PRESTIGE.md`): the player leaves at the first visit where the Exit would raise the Prestige bonus by 15% or more (`EXIT_MIN_GROWTH`; the `×A → ×B` on the button), buys the cheapest affordable Legacy perk across the Network and Capital tracks (Network first on ties), and plays the next career under those perks and the bonus. The single run's finish and `simulateExits`' first career agree (`pace.test.ts`). It stops when a career owns everything. `npm run pace -- exit [visits minutes clicks] [falling]` prints the careers; `falling` leaves when the Prestige per hour of the career starts to fall instead.

**For a player who visits every few hours, the Exit never opens in time.** The Regular player owns everything on day 0.7 to 1.0, at roughly 1e16 to 6e17 dollars earned, well before an Exit would raise the bonus by 15% (that needs about 6e13 earned for 5 Prestige at the fine rungs, and the check runs at the start of a visit). The model's answer is one career and no Exit. The Exit pays for a player who is away for days:

The weekly player (one visit of 30 minutes every seven days), one-of-each:

| Career | Day in | Day out | Exit open after (days) | Row 6 after (days) | Matched the last career's earnings after (days) | Owned everything after (days) | Perks held | Earned | Prestige paid | Prestige total | Bonus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.00 | 21.00 | 14.00 | 7.00 | - | - | 0 | 3.3e+17 | 87 | 87 | x3.61 |
| 2 | 21.00 | 28.00 (done) | - | 0.01 | 7.00 | 7.00 | 10 | 4.9e+18 | - | 87 | x3.61 |

It leaves on day 21 with 87 Prestige, buys ten perks, reaches capital row 6 within a visit of starting, matches the first career's earnings in a week, and owns everything on day 28, a week sooner than the single run (35 days). The stacker, whose finish is day 21, owns everything before the Exit pays 15% and never leaves. The Exit constants were tuned for careers that took weeks and have not been retuned: `PRESTIGE_EARN_SCALE = 5e11` and `PRESTIGE_MULT_PER = 0.03` are unchanged.

Long weekend only matters where the 8 hour cap binds: for a once-a-day player it lifts the cap to 12 hours from the second career.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **The capital tail no longer sets the time.** It used to: the last capital row, Mars megacampus Holdings, was $4.3e16 after the purchase scale, 6.6 days of full income on its own, and a Regular career took four to nine days. Rows 12 to 25 are now priced at the square root of their old price over the price of row 11 (see "Changing the pace"), so the last row is $6.0e12 and its price alone is about a minute of full income (the script prints the number). What is left is the lifetime XP the last skill waits on, a day in, and the visits it takes to spend the money.
- **Reinvesting no longer helps.** Re-buying second copies used to raise income past what first copies give. With a career of about a day, a two-day payback buys copies that nothing repays: a Regular reinvestor now finishes about a visit after the collector. The collector's constant is the one to use for planning.
- **Total hands-on time is small.** The target player (4 visits of 5 minutes) is at the game for about 20 minutes to own everything, over one day. The Regular player is there 1 hour. The wall-clock numbers are long only for schedules with long gaps.

## What the model assumes

`simulatePace` in `src/game/pace.ts` plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled. The kitchen's combo bonuses are left out too.

## How far to trust it

- **Both players: within about a third of the model**, for schedules that visit at least daily. A career is about a day now, so the finish is a whole number of visits and the lifetime XP gate on the last skill sets a floor; a formula in days cannot follow steps that coarse more closely than that. The reinvestor constant does not hold for visits further apart than a day, because a two day payback is out of reach when you only shop every other day. The table shows `n/a` there. Use the collector's constant.
- **The two players are close.** With the tail cut they finish within about one visit of each other, so the answer is a single number, not a range.
- **The player is simple.** Clicking is a steady rate for the whole visit, shopping takes no time, and the shopper never plans ahead. A real player clicks in bursts and sometimes saves for a big row. The model only needed to be right about the shape.
- **It is only as good as the tables.** `src/game/pace.test.ts` checks the formula against the model for four schedules and fails if the constants drift past 35%. When it does, rerun `npm run pace`, refit `PACE_K` in `src/game/pace.ts`, and update this page.

## Changing the pace

Each is the formula's answer, with the first one checked against the model.

- **Price of the late capital rows.** The tail was most of a collector's time. Rows 12 to 25 (era q3 and end) are repriced as `P × (old / P)^0.5` with `P` the price of row 11 ($1e9 before the purchase scale), so each row still costs more than the one before it and the ramp keeps its shape on a log scale, just flatter. Gear is unchanged: once the capital tail was cut, the stacker's gear finished the same day. An exponent of 0.55 or lower reaches day 1.00 for the 4 visits of 5 minutes target (the lifetime XP gate is a day in, so a deeper cut buys nothing); 0.6 leaves the stacker's gear a visit late. The rule uses 0.5. Do not change `PURCHASE_COST_SCALE` for this: it moves the early game too.
- **The 8 hour offline cap** (`OFFLINE_CAP_MS` in `src/game/save.ts`). It is the main limit on a once-a-day player. At 12 hours, the Daily player's `idleShare` goes from 0.35 to 0.52, and pace from 0.38 to 0.55, about 45% faster. It changes nothing for anyone who already visits every 8 hours. If you change the cap, change `OFFLINE_CAP_SECONDS` in `src/game/pace.ts` too; a test checks they match.
- **Job click share.** `s` is the sum of the jobs' `clickPct`. It only matters to someone who clicks a lot.
