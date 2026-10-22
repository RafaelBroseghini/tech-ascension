# Pacing: how long the game takes

How many days of real time it takes to own everything, for someone who does not sit at the game all day: they open it, click and shop for a while, leave, and come back.

"Own everything" is the game's own finish line for the shop (`ownsEverything` in `src/game/nextUnlock.ts`): every skill, gig, job, gear row and capital row held at least once. It is the same test that unlocks Auto-click. Second copies are optional.

A career now finishes on the later of two days: the day it owns everything and the day the product wins the world (8B users). The pace model prints both. The formula below is about the first.

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

Days of real time, from the model (`src/game/pace.ts`) and from the formula. Each player column reads "finish / owns everything / formula": the finish is the later of owning everything and the win, and the formula is about owning everything. "Hands-on to finish" is the time actually spent at the game, visits × minutes, until the finish. The stacker (reinvestor) re-buys anything that repays within two days; the one-of-each player (collector) within an hour. Regenerate with `npm run pace`.

| Player | Visits | Minutes | Clicks/s | Idle share | Pace | Stacker: finish / owns everything / formula | One-of-each: finish / owns everything / formula | Hands-on to finish (stacker / one-of-each) | Longest wait, visits (stacker / one-of-each) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Left open, clicking in bursts | 24/day | 15 | 2 | 1.00 | 1.29 | 0.6 / 0.6 / 0.7 days | 0.4 / 0.4 / 0.6 days | 3.8 h / 2.5 h | 1 / 0 |
| Hardcore | 6/day | 20 | 3 | 1.00 | 1.14 | 0.8 / 0.8 / 0.8 days | 0.7 / 0.7 / 0.7 days | 100 min / 80 min | 0 / 0 |
| Regular | 3/day | 15 | 2 | 1.00 | 1.04 | 1.0 / 1.0 / 0.9 days | 1.0 / 0.7 / 0.8 days | 46 min / 45 min | 0 / 0 |
| Commuter | 2/day | 10 | 2 | 0.68 | 0.70 | 1.5 / 1.5 / 1.3 days | 2.0 / 1.5 / 1.1 days | 31 min / 40 min | 0 / 0 |
| Daily | 1/day | 30 | 2 | 0.35 | 0.38 | 2.1 / 2.0 / 2.4 days | 3.0 / 3.0 / 2.1 days | 62 min / 90 min | 0 / 0 |
| Daily, short | 1/day | 10 | 2 | 0.34 | 0.35 | 3.1 / 3.0 / 2.6 days | 4.0 / 3.0 / 2.3 days | 31 min / 40 min | 0 / 0 |
| Every other day | 0.5/day | 30 | 2 | 0.18 | 0.19 | 6.0 / 6.0 / n/a days | 6.0 / 6.0 / 4.2 days | 90 min / 90 min | 0 / 0 |
| Weekly | 0.14/day | 30 | 2 | 0.05 | 0.05 | 21.0 / 21.0 / n/a days | 35.0 / 35.0 / 14.8 days | 90 min / 2.5 h | 0 / 0 |

The finish is a whole number of visits, so a schedule with a long gap between visits reads in steps and the formula is only close, within about a third (the test allows 35%, and half for the player who leaves it open all day: the formula knows nothing of the product's revenue or an IC's growth, which pay for gear sooner than it says).

**Longest wait** is the most visits in a row that bought no first copy of anything (a skill, gig, job, gear or capital row) before the career owned everything. The model only buys at visits, so a wait is counted in visits. A career that ends in a day should never come back to nothing new: for the target player (4 visits a day of 5 minutes, 2 clicks a second) both players wait 0 visits and own everything on day 1.00, and `pace.test.ts` pins at most 1. The wait stops counting once everything is owned: after that the career waits on the product, not the shop.

To try your own: `npm run pace -- 3 15 2` takes visits per day, minutes per visit and clicks per second. It also prints the day each milestone is reached. The full table run ends with the best-fit `K` for each player, over the schedules that visit at least daily.

**The leadership line.** The model picks a line when it first holds Senior SWE (`PaceOptions.leadership`, default `ic`; `DEFAULT_PACE_LEAD`). An IC holds 27 rows instead of 31 (the manager rows 18, 20, 21 and 22 are never bought), so the shop is a little cheaper and the click share at the end is 0.575 instead of 0.68. For the target player (4 visits a day of 5 minutes, 2 clicks a second) the day everything is owned stays 1.00 (the model buys at visits a quarter day apart) and the win moved from day 1.40 to 1.37 for the stacker and stayed at 1.39 for the one-of-each player (before the IC's own growth, below: with it the win is on day 1.04 and 1.26). The model has no hires, so `leadership: "manager"` only changes the ending.

## The product in the single run

The single run now models the product (an IC player, no hires, the free home region, no incidents) and does not model the kitchen's combo bonuses yet. The game's own `advanceCompany` walks it, so a change to `GROWTH_PER_SEC`, the serving gear or the revenue moves these numbers. `npm run pace -- 4 5 2` (the target player, 4 visits a day of 5 minutes, 2 clicks a second) prints the days the career gates to come sit on:

```
Career gates (one visit is 0.25 days): users against the job each gate sits on, then the finish
- oneOfEach: Mid-level SWE day 0.25, 10k users day 0.26; Senior SWE day 0.50, 1M users day 0.50; win day 1.51, owns everything day 1.25, finish day 1.51
- stacker: Mid-level SWE day 0.25, 10k users day 0.26; Senior SWE day 0.50, 1M users day 0.50; win day 1.29, owns everything day 1.25, finish day 1.29
```

- **10,000 users land within a visit of Mid-level SWE and 1,000,000 within a visit of Senior SWE.** (Measured before the user gates existed; the gates are now in the game, see "The user gates" below.) Both players took both jobs at their second visit (day 0.25), and the product reached 10k and 1M a few minutes later, at every growth pace tried (`GROWTH_PER_SEC` 0.0125 to 0.1).
- **The win was not inside a day.** (Measured before the build's effects: the stacker now wins on day 1.04 and the one-of-each player on 1.26, see "Specialization and leadership effects". The rest of this section is the measurement behind it.) The shop is done on day 1.00, but the 8B win landed on day 1.4 (hands-on 27 minutes). The growth pace is not what holds it: raising `GROWTH_PER_SEC` eight times only brings it to 1.06 (stacker) and 1.27 (one-of-each). The player buys serving gear for the crowd it has, once per visit, and spends everything else on rows that pay back in income. At the day 0.75 visit it holds $1.9e13 and the cheapest serving gear that would carry 8B users (about 1e9 requests a second, from what it already owns) costs $1.1e12, so it could afford it; it just does not buy ahead of the crowd. The crowd then sits at the gear's capacity (9e8 users) for the last quarter day, and the 8B follows once the visit at day 1.0 and the one at 1.25 buy the rest.
- **Buying ahead does not fix it by itself.** Sizing the serving shortfall for the crowd at the next visit (each region grown over the time away with `grownUsers`, keeping the two-day payback guard) changes nothing: the finish stayed at 1.39 and 1.40 (1.39 and 1.37 since the manager rows left the IC's ladder). At the day 0.75 visit the gear passes the guard (its payback is about 0.6 days) but loses the ordering, because first copies of the late capital rows pay back faster and take the whole $1.9e13. Giving needed serving gear priority over those (payback divided by 10) brings the win to 1.26, by 1000 to 1.12, and no higher pace gets below 1.02; and from a pace of 0.025 up the gear money delays owning everything to day 1.25. Past day 1.0 the crowd also needs hours to fill the regions the footprint does not reach (reach 0.15), so the win and the shop compete for the same money by day 1.0. Getting both inside a day is a trade between the capital tail and the product's gear, which is a later step (prices or the footprint), not a rule or a constant here.
- **Growth is solved exactly.** `stepCompany` used to take one explicit step per minute. At the raised pace that is a factor of `GROWTH_PER_SEC x STEP_MS / 1000` = 0.05 x 0.25 x 60 = 0.75 per step (0.09 at the old 0.006), where the explicit step is no longer close to the curve: a tenth of a second at a time ended 41% above a minute at a time. A region now grows by the closed-form logistic over each piece, and a step is walked in pieces of at most `SUBSTEP_S` = 5 seconds so the crowd and the gear see each other: the factor is 0.06 per piece and one hour at 100 ms against 60 s steps differs by 1.4%.
- **One pace.** The ladder's 0.25 (`GROWTH_BASE`) only existed to contrast with the removed founder fork. It is folded into `GROWTH_PER_SEC` = 0.0125 (what 0.05 x 0.25 was), the multiplier is 1 for the player's own pace, and the hires' `growth` is four times what it was so the team multiplies the player's pace by the same amount. Dropped users churn at `DROP_CHURN_PER_SEC` = 0.075, so a crowd the gear cannot serve still settles near its capacity (the growth would otherwise outrun the churn).
## The user gates

The specialization pick opens at 10,000 users and the Senior SWE job (rank 14) needs 1,000,000 (`PICK_USERS`, `SENIOR_USERS` in `src/data/specializations.ts`; `pickUsersShort` and `seniorUsersShort` in `src/game/build.ts`). Both latch: a job of rank 14 or higher held (the switch keeps `peakRank`) keeps Senior open, and the pick is made once. The pace model's company feeds the gates, and it takes its pick the moment it opens, not only after a purchase.

What they cost the pace:

- **A player who visits hourly loses nothing.** The left-open player (24 visits a day of 15 minutes) reads the same table as before: the product reaches both marks before the visits that buy the jobs, so owns-everything stays 0.42 and 0.63 days and the table in "Pace by build" is unchanged.
- **The target player (4 visits of 5 minutes) loses one visit.** Mid-level SWE is taken at day 0.25 and the product reaches 10,000 users a few minutes later (day 0.26), outside the 5 minute visit, so the pick and Senior move to the next visit (day 0.50). Everything is owned on day 1.25 instead of 1.00, the stacker wins on day 1.29 (was 1.04) and the one-of-each player on 1.51 (was 1.26). Lowering the marks to 2,000 and 200,000 users changes nothing: the product's users wait on the serving gear Senior and capital pay for, so the next visit is the one that buys it. The test pins (`pace.test.ts`, `leadership.test.ts`) moved to 1.26 and 1.55 to match.
- **Every other profile in the table is unchanged.**

## Specialization and leadership effects on the product

`ProductFacts` (`src/game/globe/product.ts`) carries what the build does to the product; `productFactsOf(hires, legacy, build)` reads the specialization, the line and the IC rows held, and the tick, the offline credit and the pace model all go through it. A factor of 1 changes nothing, and so does no pick. The numbers are proposals (`docs/BUILDS.md`), not tuned per build:

| Build | Effect | Factor |
| --- | --- | --- |
| Backend / Platform | growth, revenue | x0.85, x1.3 |
| Infra / SRE | what dropped requests cost (dollars and users who leave) | x0.5 |
| Forward deployed | growth, users each cleared gig seeds | x0.9, x3 |
| Security | incident rate and how hard a block or a law bleeds | x0.6 |
| Frontend, AI | none yet (they need launches and GPUs) | 1 |
| IC line | growth for each IC row held (five rows) | +3 each, scaled like the team, not counted as the team |

The IC bonus is sized against `hireBonusOf`: a kind of hire at 100 heads adds about 3.5 to 5, so five IC rows (+15) are worth a mid-sized team with no payroll, and a Manager's team passes it with a few hundred heads. The pace model has no hires, so it can only say how the IC and the specializations move the default career: the default (Backend, IC) now wins the world on day 1.04 (stacker) and 1.26 (one-of-each) at 4 visits of 5 minutes, against 1.37 and 1.39 before, with everything owned on day 1.00. The win is no longer the finish for the stacker.
## Pace by build

`npm run pace -- builds [visits minutes clicks]` plays every specialization on each leadership line. The Manager has hires in the model (`HIRE_CASH_SHARE`, `HIRE_PAYROLL_SHARE` in `src/game/pace.ts`): it hires the cheapest open kind (the ranks the line has reached open the kinds, `hireLocked`) whenever the copy costs at most 5% of its cash and the payroll with that head stays within 5% of what the product's served users pay. Salaries come out of the balance, and the team's growth is the game's own (`hireBonusOf`). That policy is an assumption about the player, not a game number. Cells read "owns everything / wins the world" in days.

The target player (4 visits of 5 minutes) cannot tell builds apart: visits are a quarter day apart, so every cell lands on 1.00 or 1.25. The player who leaves it open (24 visits a day of 15 minutes, 2 clicks a second) has an hour of resolution:

| Specialization | Style | IC, one-of-each | IC, stacker | Manager, one-of-each | Manager, stacker |
| --- | --- | --- | --- | --- | --- |
| Frontend | click | 0.42 / 0.13 | 0.63 / 0.11 | 0.42 / 0.09 | 0.63 / 0.09 |
| Backend / Platform | balanced | 0.42 / 0.17 | 0.63 / 0.16 | 0.42 / 0.14 | 0.63 / 0.14 |
| Infra / SRE | idle | 0.42 / 0.17 | 0.63 / 0.15 | 0.42 / 0.14 | 0.63 / 0.14 |
| AI engineer | idle | 0.42 / 0.17 | 0.63 / 0.15 | 0.42 / 0.14 | 0.63 / 0.14 |
| Forward deployed engineer | click | 0.42 / 0.13 | 0.63 / 0.11 | 0.42 / 0.09 | 0.63 / 0.09 |
| Security | balanced | 0.42 / 0.17 | 0.63 / 0.15 | 0.42 / 0.14 | 0.63 / 0.14 |

What it says:

- **The shop is the finish, on both lines.** The win comes at 0.09 to 0.17 days, long before everything is owned (0.42 and 0.63), so no specialization's growth factor and neither line changes the finish for this player. They only differ in when the world is won: a Manager wins about 0.03 days sooner than an IC, and a click build about 0.04 sooner than the rest.
- **The Manager's gap was the hiring policy, not the game's numbers.** At a payroll share of 25% the Manager finished up to 40% later than the IC (Backend 0.59 against 0.42): the salaries eat the money the gear needs, and the win waits on serving gear, so the team made the win later. At 5% the lines are level (within 1%); at 10% still within 2%; with no hires at all a Manager is 60 to 90% slower than an IC (the IC's own growth carries it). Scaling the hires' `growth` from 1 to 5 times does not move it at any share. So a Manager who hires hard is a trap and one who hires lightly is a peer; no constant changed.
- **The click and idle numbers have pace data now, but not a tuned target.** A click build's full multiple is near 4.2 (not 5) with the rows a line holds.
- **Not modeled:** incidents (so Security's incident factor and Infra's drop factor are inert here, as is FDE's seed factor on the single home region), the kitchen's combos, and Frontend's and AI's mechanics (they have none yet).

## Over several careers (the Exit)

**Stale after the capital tail cut.** The Exit constants and the targets below were tuned for careers that took days; careers now take about a day, so the first Exit pays over a hundred Prestige and the targets and sweep below no longer hold (the Exit is admin-only and was left alone). The first career table, the `falling` and the Long weekend figures are regenerated after the product was tuned to the pace of the single run (the player's own pace in `GROWTH_PER_SEC` is about eight times what it was); the sweep table and the one-of-each narrative are the old numbers.

`simulateExits` in `src/game/pace.ts` plays the same player through the Exit (`docs/PRESTIGE.md`): the first career leaves once the Exit would raise the Prestige bonus enough, every career after that can leave at any visit. After each Exit it spends the Prestige on the cheapest perk it can pay for across the Network, Founder and Capital tracks (Network first on ties), applies the Prestige multiplier to every income and XP rate, and stops when a career owns everything **and** has won the world. `npm run pace` prints it for the Regular player after the table; `npm run pace -- exit [visits minutes clicks] [falling]` prints it for any profile.

**Both models have the product.** `simulatePace` (the single run) and `simulateExits` walk the same product:

- **Modeled.** Users by region, grown with the game's own `advanceCompany`: gigs seed regions, the gear the sim already buys serves them (`capacityOf`), served users pay (`arpuOf`), dropped requests cost, and the footprint is the free home region. The player is an IC with no hires. The Prestige bonus and Viral loop multiply growth, Platform multiplies revenue, the win at 8B users pays its x1.25 on everything earned after and records the night owl ending and its 5 Prestige. Early adopters seeds 1,000 users; Long weekend lengthens the offline cap; Volume discount, Bulk hardware, Raise season and Compounding change prices and income through the game's own functions. In the single run, time away past the offline cap is not walked by the product (the game never credits it), and the dates of the product milestones are on the wall clock.
- **Left out.** Incidents (the random draw never throws one), hires (so only the **night owl** ending can be won: the Hall of Fame's other one is not modeled, and neither is "both in about a month"), regions and points of presence beyond the free home region, any gear bought to serve users beyond what the one-of-each and stacker rules already buy, and the kitchen's combo bonuses (`docs/BUILDS.md`, section 5), which are not in the economy yet.

The single run's finish is the later of owning everything and the win; `simulateExits`' first career agrees with it on both days (`pace.test.ts`). The single run also dates three product milestones (`users10k`, `users1m`, `won`), and the script prints them next to the jobs the career gates will sit on.

The player leaves at the first visit where the Exit would raise the Prestige bonus by 15% or more (`EXIT_MIN_GROWTH`; the `×A → ×B` on the button). The textbook rule, "leave when Prestige per hour starts to fall", is `falling`: with the product both Regular players now finish in their first career on day 1.3, never leaving, so it does not test the replay either.

Tuned constants (`src/data/legacy.ts`), kept at their original values because they still land: `PRESTIGE_EARN_SCALE = 5e11` (the first Prestige needs $5e11 earned across careers: the Exit opens around day 1.0 and is taken a visit or two later), `PRESTIGE_MULT_PER = 0.03` and `ENDING_BONUS = 5`. Swept around them for the Regular player (3 visits a day of 15 minutes, 2 clicks a second). The first row is measured at the 8B target; the other rows were swept at the old 7B target and are kept for their direction:

| Scale | Per Prestige | Ending bonus | First Exit (stacker / one-of-each) | Done (stacker / one-of-each) |
| --- | --- | --- | --- | --- |
| 5e11 | 0.03 | 5 | day 1.67 +5 / day 2.00 +6 | career 6, day 12.7 / career 7, day 19.3 |
| 5e11 | 0.03 | 10 | day 1.67 +5 / day 2.00 +6 | career 7, day 14.0 / career 6, day 16.0 |
| 5e11 | 0.06 | 5 | day 1.33 +3 / day 1.67 +3 | career 9, day 14.3 / career 8, day 15.3 |
| 3e11 | 0.03 | 5 | day 1.67 +6 / day 2.00 +7 | career 7, day 13.7 / career 7, day 17.7 |
| 1e12 | 0.03 | 5 | day 2.00 +7 / day 2.00 +5 | career 6, day 13.7 / career 6, day 18.0 |
| 2e11 | 0.10 | 5 | day 1.00 +2 / day 1.33 +3 | career 7, day 9.3 / career 9, day 12.0 |

A larger bonus per Prestige finishes in more careers, not fewer (each Exit pays fewer rungs), and a smaller scale pays the first Exit earlier for more Prestige but also adds careers.

The stacker, career by career (users at the Exit, Prestige paid, the bonus after):

| Career | Day in | Day out | Exit open after (days) | Row 6 after (days) | Matched the last career's earnings after (days) | World won after (days) | Users | Perks held | Earned | Prestige paid (ending bonus) | Prestige total | Bonus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.00 | 1.00 | 1.00 | 0.67 | - | - | 1.7B | 0 | 6.5e+17 | 108 | 108 | x4.24 |
| 2 | 1.00 | 1.67 | 0.33 | 0.01 | 0.67 | 0.43 | 8.2B | 13 | 8.3e+18 | 158 (5) | 266 | x8.98 |
| 3 | 1.67 | 2.00 | 0.33 | 0.00 | 0.33 | 0.05 | 8.2B | 13 | 1.4e+19 | 98 | 364 | x11.92 |
| 4 | 2.00 | 2.33 | 0.33 | 0.00 | 0.33 | 0.04 | 8.2B | 13 | 2.3e+19 | 92 | 456 | x14.68 |
| 5 | 2.33 | 2.67 | 0.33 | 0.00 | 0.33 | 0.03 | 8.2B | 13 | 3.0e+19 | 81 | 537 | x17.11 |
| 6 | 2.67 | 3.33 (done) | 0.33 | 0.00 | 0.33 | 0.02 | 8.2B | 13 | 8.8e+19 | - | 537 | x17.11 |

Long weekend only matters where the 8 hour cap binds: for a once-a-day player (`npm run pace -- exit 1 30 2`) it lifts the cap to 12 hours from the second career. The stacker now wins the world in its first career (day 3.0, no Exit), and the one-of-each player in the 3rd on day 5.0.

The one-of-each player's run is shorter: one Exit on day 1.0 (6.5B users, 108 Prestige), then the world is won in career 2, done on day 1.67 (so no night owl ending bonus is paid). With the IC's growth (below) it is done on day 1.34 and the stacker's six careers end on day 3.33 (the stacker table below was taken before it and is kept for the record).

Against the targets for the Regular player (all stale after the tail cut; the old results are kept for the record, and `pace.test.ts` now pins the model's own output):

- **First Exit around day 1.5 to 2:** met (1.67 and 2.00).
- **Career 2 reaches the point where career 1 exited in under half the time:** met for the **capital row**: row 6 comes 0.34 days in against 0.67 (one visit; the model cannot see faster than the 8 hours between visits). **Not met for earnings:** career 2 earns what career 1 earned in all after 1.67 days, for both players, against career 1's 1.67 days (stacker) and 2.00 (one-of-each). Income grows exponentially through the second day, so a head start of a few hours saves a few hours, and no value of the three knobs fixes it in the sweep above (the best case, 0.06 per Prestige, takes 0.80 of the first career's time and finishes in 8 to 9 careers). The perks are for the player who plays the early game by hand.
- **The career that owns everything (or wins the world, whichever is later) is the 4th to 7th, two to three weeks:** met (6th on day 12.7 for the stacker, 7th on day 19.3 for the one-of-each player). (old result.)
- **Both endings in about a month:** not checked. The model has no hires, so it can only reach the night owl ending (career 6 for the one-of-each player). The first Exit after a win pays the 5 Prestige once.

## Reading it

- **Leaving is free up to 8 hours.** While your visits are no more than 8 hours apart, `idleShare` is 1 and nothing is wasted. Past that, every extra hour away earns nothing. A night's sleep is fine; a long work day on top of it loses the hours past 8.
- **Visits matter more than clicks.** Below three visits a day, one more visit adds up to 8 hours of income. A whole visit of clicking adds a few percent: 15 minutes at 2 clicks a second, three times a day, is +4%.
- **The capital tail no longer sets the time.** It used to: the last capital row, Mars megacampus Holdings, was $4.3e16 after the purchase scale, 6.6 days of full income on its own, and a Regular career took four to nine days. Rows 12 to 25 are now priced at the square root of their old price over the price of row 11 (see "Changing the pace"), so the last row is $6.0e12 and its price alone is about a minute of full income (the script prints the number). What is left is the lifetime XP the last skill waits on, a day in, and the visits it takes to spend the money.
- **Reinvesting no longer helps.** Re-buying second copies used to raise income past what first copies give. With a career of about a day, a two-day payback buys copies that nothing repays: a Regular reinvestor now finishes about a visit after the collector. The collector's constant is the one to use for planning.
- **Total hands-on time is small.** The target player (4 visits of 5 minutes) is at the game for about 20 minutes to own everything, over one day. The Regular player is there 1 hour. The wall-clock numbers are long only for schedules with long gaps.

## What the model assumes

`simulatePace` in `src/game/pace.ts` (with the product, see above) plays the real tables with the real gates and the game's own economy functions, so a table change moves the answer.

- You visit `visitsPerDay` times, evenly spaced, for `minutesPerVisit` each, clicking `clicksPerSec` the whole visit. You buy only while you are there.
- Time away pays idle income and idle XP, up to the offline cap, once, when you return.
- You take every gig and job as soon as it opens, and buy a first copy of anything as soon as you can afford it.
- A second copy of a skill, gear row or capital row is bought only if it earns itself back within the player's payback limit (an hour for the collector, two days for the reinvestor), best payback first.
- Random events and click boosts are left out, so this is an estimate with no luck in it. They would move the real number, by how much is not modeled.

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

## Product revenue

Served users pay a few cents a second, so the product earns next to the day job. Dropped users pay nothing. `arpuOf(users)` in `src/game/globe/load.ts` is the dollars a second one served user pays, and `revenuePerSec` is served users times that. The numbers come from a one-off simulation of the real tables (not kept in the repo).

Three targets set it: 1,000 served users pay about the internship ($8/s), about 1M pay about the Senior SWE ($200/s), and at 1B the product is a real share of upper-era capital (rows 6-11 pay $695,000/s together; rows 1-5 pay $16,050/s). A flat ARPU cannot do all three. $0.008 matches the internship but pays $8,000/s at 1M, forty Senior salaries. $0.0002 matches the Senior at 1M and gives 29% of upper capital at 1B, but a thousand users then pay $0.20/s, 3% of an internship. So ARPU falls with scale: a small crowd is worth a salary, a big one pays pennies each. The pick is one function, `ARPU_BASE * (1 + ARPU_EARLY / (1 + users / ARPU_KNEE))` with a base of $0.0002, an early bonus of 80 and a knee at 1,000 users. It pays $0.0082 a user at 1k, $0.00022 at 1M and $0.0002 from 100M on. Revenue still rises with every user, only slower per head. The "gear" column is the cheapest serving gear (greedy on price per request) that keeps up with that many users, at 0.1 requests a second each; it is what the crowd costs to serve, and the gear pays its own $/s too.

| Users | Gear to serve them | Flat $0.0002 | Flat $0.002 | Flat $0.008 | Chosen curve |
| --- | --- | --- | --- | --- | --- |
| 1k | $1.4k | $0.20/s | $2.00/s | $8.00/s | $8.00/s |
| 100k | $1.8M | $20/s | $200/s | $800/s | $35/s |
| 1M | $1.8M | $200/s | $2.0k/s | $8.0k/s | $216/s |
| 100M | $321M | $20k/s | $200k/s | $800k/s | $20k/s |
| 1B | $13.5B | $200k/s | $2.0M/s | $8.0M/s | $200k/s |
| 8B | about $595B | $1.6M/s | $16M/s | $64M/s | $1.6M/s |

Reference incomes: internship $8/s, Senior SWE $200/s, capital rows 1-5 $16,050/s, rows 6-11 $695,000/s. The chosen curve gives 1.0 internships at 1k, 1.08 Seniors at 1M, and 29% of upper capital (12.5 times mid capital) at 1B. At 8B it pays $1.6M/s, about a quarter of q3 capital (rows 12-14 pay $6.5M/s). Product revenue is not scaled by the event multipliers, so it stays the same size under a boost.

## Hires

A career can hire (`src/game/globe/hires.ts`): eight tiers of person, from an outsourced body shop to a code god, each hired again and again. Copy `n` of a tier costs `floor(price × 1.003^n)`, pays a salary a second per head, and adds `growth × (1 − e^(−heads / 400))` to the growth multiplier, so each tier has diminishing returns and a cap. Base prices run $5k to $50B (×10 a tier), salaries $1 to $400/s per head (1, 5, 12, 25, 50, 100, 200, 400), caps 2.5, 3, 3.5, 4, 4.5, 5, 5.7, 6.4. A tier lists once the one before it has a hire.


`src/game/globe/hires.pace.test.ts` runs the real `stepCompany` from 1,000 users to 8B, on the same footprint and serving gear, with no incidents, and a day job that pays $200/s (a Senior SWE). It pins two careers and the test fails if they drift:

| Career | Time to 8B | Ending |
| --- | --- | --- |
| No hires | 11.3 h (0.470 days), 6.3× the hiring career | night owl |
| Spends all its cash on hires (best growth per dollar first, about 2,300 heads in the first three tiers) | 1.80 h (0.075 days) | sponsor (95% of users from hires) |

The bounds are: no hires at least 4× slower than hiring, and the team above half the users. The greedy buyer can open every tier but never gets past copy-paster: the cheap tiers give more growth per dollar until the world is won. Gear, capital and incidents are left out of both, so these are shapes, not forecasts.
